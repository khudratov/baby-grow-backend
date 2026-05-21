import { Injectable } from '@nestjs/common';
import { WeightHeight } from '@prisma/client';
import {
  assertFamilyAccessForChild,
  assertFamilyAccessForEntity,
} from '../families/family-access.helper';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateRange } from '../tracking/date-range.util';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { UpdateMeasurementDto } from './dto/update-measurement.dto';

@Injectable()
export class MeasurementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    childId: string,
    dto: CreateMeasurementDto,
  ): Promise<WeightHeight> {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'tracker');
    return this.prisma.weightHeight.create({
      data: {
        childId,
        at: new Date(dto.at),
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        note: dto.note,
      },
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
    const existing = await this.prisma.weightHeight.findUnique({
      where: { id },
      select: { childId: true },
    });
    await assertFamilyAccessForEntity(this.prisma, userId, existing, 'tracker');
    const data: Record<string, unknown> = {};
    if (dto.at !== undefined) data.at = new Date(dto.at);
    if (dto.weightKg !== undefined) data.weightKg = dto.weightKg;
    if (dto.heightCm !== undefined) data.heightCm = dto.heightCm;
    if (dto.note !== undefined) data.note = dto.note;
    return this.prisma.weightHeight.update({ where: { id }, data });
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.weightHeight.findUnique({
      where: { id },
      select: { childId: true },
    });
    await assertFamilyAccessForEntity(this.prisma, userId, existing, 'tracker');
    await this.prisma.weightHeight.delete({ where: { id } });
  }
}
