import { Injectable, NotFoundException } from '@nestjs/common';
import { WeightHeight, WeightHeightRevision } from '@prisma/client';
import {
  assertFamilyAccessForChild,
  assertFamilyAccessForEntity,
} from '../families/family-access.helper';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateRange } from '../tracking/date-range.util';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { UpdateMeasurementDto } from './dto/update-measurement.dto';

export type RevisionWithEditor = WeightHeightRevision & {
  editedByUser: { id: string; displayName: string } | null;
};

@Injectable()
export class MeasurementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    childId: string,
    dto: CreateMeasurementDto,
  ): Promise<WeightHeight> {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'tracker');
    // Create the measurement AND its INITIAL revision in one transaction so
    // every audit trail starts with the original values.
    return this.prisma.$transaction(async tx => {
      const created = await tx.weightHeight.create({
        data: {
          childId,
          at: new Date(dto.at),
          weightKg: dto.weightKg,
          heightCm: dto.heightCm,
          note: dto.note,
        },
      });
      await tx.weightHeightRevision.create({
        data: {
          measurementId: created.id,
          kind: 'INITIAL',
          at: created.at,
          weightKg: created.weightKg,
          heightCm: created.heightCm,
          note: created.note,
          editedByUserId: userId,
        },
      });
      return created;
    });
  }

  async list(
    userId: string,
    childId: string,
    from?: string,
    to?: string,
  ): Promise<WeightHeight[]> {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'read');
    const range = parseDateRange(from, to);
    return this.prisma.weightHeight.findMany({
      where: { childId, at: { gte: range.from, lt: range.to } },
      orderBy: { at: 'desc' },
      take: 500,
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateMeasurementDto,
  ): Promise<WeightHeight> {
    // Load the full row so we can snapshot its current state into a revision
    // BEFORE applying the change.
    const before = await this.prisma.weightHeight.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Measurement not found');
    await assertFamilyAccessForEntity(
      this.prisma,
      userId,
      { childId: before.childId },
      'tracker',
    );
    const data: Record<string, unknown> = {};
    if (dto.at !== undefined) data.at = new Date(dto.at);
    if (dto.weightKg !== undefined) data.weightKg = dto.weightKg;
    if (dto.heightCm !== undefined) data.heightCm = dto.heightCm;
    if (dto.note !== undefined) data.note = dto.note;
    return this.prisma.$transaction(async tx => {
      await tx.weightHeightRevision.create({
        data: {
          measurementId: id,
          kind: 'EDIT',
          at: before.at,
          weightKg: before.weightKg,
          heightCm: before.heightCm,
          note: before.note,
          editedByUserId: userId,
        },
      });
      return tx.weightHeight.update({ where: { id }, data });
    });
  }

  async delete(userId: string, id: string): Promise<void> {
    const before = await this.prisma.weightHeight.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Measurement not found');
    await assertFamilyAccessForEntity(
      this.prisma,
      userId,
      { childId: before.childId },
      'tracker',
    );
    // The revisions table has onDelete: Cascade on measurementId. To keep
    // the audit trail meaningful for "what did the deleted record look like?"
    // we don't write a DELETE revision here — the row is going away and so
    // are its revisions. Skipping the snapshot avoids dead audit data.
    await this.prisma.weightHeight.delete({ where: { id } });
  }

  async listRevisions(
    userId: string,
    measurementId: string,
  ): Promise<RevisionWithEditor[]> {
    const existing = await this.prisma.weightHeight.findUnique({
      where: { id: measurementId },
      select: { childId: true },
    });
    if (!existing) throw new NotFoundException('Measurement not found');
    await assertFamilyAccessForEntity(this.prisma, userId, existing, 'read');
    return this.prisma.weightHeightRevision.findMany({
      where: { measurementId },
      include: {
        editedByUser: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
