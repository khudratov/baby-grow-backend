import { Injectable } from '@nestjs/common';
import { DiaperChange } from '@prisma/client';
import {
  assertFamilyAccessForChild,
  assertFamilyAccessForEntity,
} from '../families/family-access.helper';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateRange } from '../tracking/date-range.util';
import { CreateDiaperDto } from './dto/create-diaper.dto';
import { UpdateDiaperDto } from './dto/update-diaper.dto';

@Injectable()
export class DiapersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    childId: string,
    dto: CreateDiaperDto,
  ): Promise<DiaperChange> {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'tracker');
    const [diaper] = await this.prisma.$transaction([
      this.prisma.diaperChange.create({
        data: {
          childId,
          at: new Date(dto.at),
          kind: dto.kind,
          note: dto.note,
        },
      }),
      this.prisma.$executeRaw`UPDATE "Child" SET "diaperStock" = GREATEST("diaperStock" - 1, 0) WHERE id = ${childId}::uuid`,
    ]);
    return diaper;
  }

  async list(
    userId: string,
    childId: string,
    from?: string,
    to?: string,
  ): Promise<DiaperChange[]> {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'read');
    const range = parseDateRange(from, to);
    return this.prisma.diaperChange.findMany({
      where: { childId, at: { gte: range.from, lt: range.to } },
      orderBy: { at: 'desc' },
      take: 500,
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateDiaperDto,
  ): Promise<DiaperChange> {
    const existing = await this.prisma.diaperChange.findUnique({
      where: { id },
      select: { childId: true },
    });
    await assertFamilyAccessForEntity(this.prisma, userId, existing, 'tracker');
    const data: Record<string, unknown> = {};
    if (dto.at !== undefined) data.at = new Date(dto.at);
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.note !== undefined) data.note = dto.note;
    return this.prisma.diaperChange.update({ where: { id }, data });
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.diaperChange.findUnique({
      where: { id },
      select: { childId: true },
    });
    await assertFamilyAccessForEntity(this.prisma, userId, existing, 'tracker');
    await this.prisma.diaperChange.delete({ where: { id } });
  }
}
