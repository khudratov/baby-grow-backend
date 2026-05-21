// src/feedings/feedings.service.ts
import { Injectable } from '@nestjs/common';
import { Feeding, SessionKind } from '@prisma/client';
import {
  assertFamilyAccessForChild,
  assertFamilyAccessForEntity,
} from '../families/family-access.helper';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentSessionService } from '../tracking/current-session.service';
import { parseDateRange } from '../tracking/date-range.util';
import { CreateFeedingDto } from './dto/create-feeding.dto';
import { UpdateFeedingDto } from './dto/update-feeding.dto';

@Injectable()
export class FeedingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: CurrentSessionService,
  ) {}

  async create(
    userId: string,
    childId: string,
    dto: CreateFeedingDto,
  ): Promise<Feeding> {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'tracker');
    const startedAt = new Date(dto.startedAt);
    const endedAt = dto.endedAt ? new Date(dto.endedAt) : null;
    return this.prisma.$transaction(async tx => {
      const feeding = await tx.feeding.create({
        data: {
          childId,
          kind: dto.kind,
          startedAt,
          endedAt,
          leftMs: dto.leftMs,
          rightMs: dto.rightMs,
          volumeMl: dto.volumeMl,
          foodNote: dto.foodNote,
        },
      });
      if (!endedAt) {
        await this.sessions.start(
          tx,
          childId,
          SessionKind.FEEDING,
          feeding.id,
          startedAt,
        );
      }
      return feeding;
    });
  }

  async list(
    userId: string,
    childId: string,
    from?: string,
    to?: string,
  ): Promise<Feeding[]> {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'read');
    const range = parseDateRange(from, to);
    return this.prisma.feeding.findMany({
      where: { childId, startedAt: { gte: range.from, lt: range.to } },
      orderBy: { startedAt: 'desc' },
      take: 500,
    });
  }

  async current(userId: string, childId: string): Promise<Feeding | null> {
    await assertFamilyAccessForChild(this.prisma, userId, childId, 'read');
    const session = await this.sessions.getCurrent(
      childId,
      SessionKind.FEEDING,
    );
    if (!session) return null;
    return this.prisma.feeding.findUnique({ where: { id: session.sessionId } });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateFeedingDto,
  ): Promise<Feeding> {
    const existing = await this.prisma.feeding.findUnique({
      where: { id },
      select: { childId: true, endedAt: true },
    });
    await assertFamilyAccessForEntity(this.prisma, userId, existing, 'tracker');
    return this.prisma.$transaction(async tx => {
      const data: Record<string, unknown> = {};
      if (dto.startedAt !== undefined) data.startedAt = new Date(dto.startedAt);
      if (dto.endedAt !== undefined)
        data.endedAt = dto.endedAt ? new Date(dto.endedAt) : null;
      if (dto.leftMs !== undefined) data.leftMs = dto.leftMs;
      if (dto.rightMs !== undefined) data.rightMs = dto.rightMs;
      if (dto.volumeMl !== undefined) data.volumeMl = dto.volumeMl;
      if (dto.foodNote !== undefined) data.foodNote = dto.foodNote;
      const updated = await tx.feeding.update({ where: { id }, data });
      // If we just ended a live session, clear CurrentSession
      if (existing && !existing.endedAt && updated.endedAt) {
        await this.sessions.end(tx, updated.childId, SessionKind.FEEDING);
      }
      return updated;
    });
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.feeding.findUnique({
      where: { id },
      select: { childId: true, endedAt: true },
    });
    await assertFamilyAccessForEntity(this.prisma, userId, existing, 'tracker');
    await this.prisma.$transaction(async tx => {
      await tx.feeding.delete({ where: { id } });
      if (existing && !existing.endedAt) {
        await this.sessions.end(tx, existing.childId, SessionKind.FEEDING);
      }
    });
  }
}
