// src/tracking/current-session.service.ts
import { ConflictException, Injectable } from '@nestjs/common';
import { CurrentSession, Prisma, SessionKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CurrentSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async start(
    tx: Prisma.TransactionClient | PrismaService,
    childId: string,
    kind: SessionKind,
    sessionId: string,
    startedAt: Date,
  ): Promise<CurrentSession> {
    try {
      return await tx.currentSession.create({
        data: { childId, kind, sessionId, startedAt },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException(
          `A ${kind.toLowerCase()} session is already active for this child`,
        );
      }
      throw e;
    }
  }

  async end(
    tx: Prisma.TransactionClient | PrismaService,
    childId: string,
    kind: SessionKind,
  ): Promise<void> {
    await tx.currentSession.deleteMany({ where: { childId, kind } });
  }

  async getCurrent(
    childId: string,
    kind: SessionKind,
  ): Promise<CurrentSession | null> {
    return this.prisma.currentSession.findUnique({
      where: { childId_kind: { childId, kind } },
    });
  }
}
