// src/sleeps/sleeps.service.ts
import { Injectable } from '@nestjs/common';
import { SessionKind, Sleep } from '@prisma/client';
import {
  assertFamilyAccessForChild,
  assertFamilyAccessForEntity,
} from '../families/family-access.helper';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentSessionService } from '../tracking/current-session.service';
import { parseDateRange } from '../tracking/date-range.util';
import { CreateSleepDto } from './dto/create-sleep.dto';
import { UpdateSleepDto } from './dto/update-sleep.dto';

@Injectable()
export class SleepsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: CurrentSessionService,
  ) {}

  async create(
    userId: string,
    childId: string,
    dto: CreateSleepDto,
  ): Promise<Sleep> {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'tracker');
    const startedAt = new Date(dto.startedAt);
    const endedAt = dto.endedAt ? new Date(dto.endedAt) : null;
    return this.prisma.$transaction(async tx => {
      const sleep = await tx.sleep.create({
        data: {
          childId,
          kind: dto.kind,
          startedAt,
          endedAt,
          note: dto.note,
        },
      });
      if (!endedAt) {
        await this.sessions.start(
          tx,
          childId,
          SessionKind.SLEEP,
          sleep.id,
          startedAt,
        );
      }
      return sleep;
    });
  }

  async list(
    userId: string,
    childId: string,
    from?: string,
    to?: string,
  ): Promise<Sleep[]> {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'read');
    const range = parseDateRange(from, to);
    return this.prisma.sleep.findMany({
      where: { childId, startedAt: { gte: range.from, lt: range.to } },
      orderBy: { startedAt: 'desc' },
      take: 500,
    });
  }

  async current(userId: string, childId: string): Promise<Sleep | null> {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'read');
    const session = await this.sessions.getCurrent(childId, SessionKind.SLEEP);
    if (!session) return null;
    return this.prisma.sleep.findUnique({ where: { id: session.sessionId } });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateSleepDto,
  ): Promise<Sleep> {
    const existing = await this.prisma.sleep.findUnique({
      where: { id },
      select: { childId: true, endedAt: true },
    });
    await assertFamilyAccessForEntity(this.prisma, userId, existing, 'tracker');
    return this.prisma.$transaction(async tx => {
      const data: Record<string, unknown> = {};
      if (dto.startedAt !== undefined) data.startedAt = new Date(dto.startedAt);
      if (dto.endedAt !== undefined)
        data.endedAt = dto.endedAt ? new Date(dto.endedAt) : null;
      if (dto.note !== undefined) data.note = dto.note;
      const updated = await tx.sleep.update({ where: { id }, data });
      // If we just ended a live session, clear CurrentSession
      if (existing && !existing.endedAt && updated.endedAt) {
        await this.sessions.end(tx, updated.childId, SessionKind.SLEEP);
      }
      return updated;
    });
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.sleep.findUnique({
      where: { id },
      select: { childId: true, endedAt: true },
    });
    await assertFamilyAccessForEntity(this.prisma, userId, existing, 'tracker');
    await this.prisma.$transaction(async tx => {
      await tx.sleep.delete({ where: { id } });
      if (existing && !existing.endedAt) {
        await this.sessions.end(tx, existing.childId, SessionKind.SLEEP);
      }
    });
  }
}
