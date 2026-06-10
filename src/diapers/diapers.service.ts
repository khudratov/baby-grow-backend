import { Injectable } from '@nestjs/common';
import { DiaperChange, Prisma } from '@prisma/client';
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
    const via = dto.via ?? 'DIAPER';
    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.diaperChange.create({
        data: {
          childId,
          at: new Date(dto.at),
          kind: dto.kind,
          via,
          note: dto.note,
        },
      }),
    ];
    if (via === 'DIAPER') {
      // A real diaper was used → consume one from stock (never below 0).
      ops.push(
        this.prisma
          .$executeRaw`UPDATE "Child" SET "diaperStock" = GREATEST("diaperStock" - 1, 0) WHERE id = ${childId}::uuid`,
      );
    }
    const [diaper] = await this.prisma.$transaction(ops);
    return diaper as DiaperChange;
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
    if (dto.via !== undefined) data.via = dto.via;
    if (dto.note !== undefined) data.note = dto.note;
    // Note: editing `via` does not retroactively adjust diaperStock — stock is
    // consumed only at create time for DIAPER events (matches existing update
    // semantics, which never touch stock).
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
