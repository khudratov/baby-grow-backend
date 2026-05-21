// src/tracking/current-session.service.spec.ts
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentSessionService } from './current-session.service';

describe('CurrentSessionService', () => {
  let svc: CurrentSessionService;
  let prisma: { currentSession: { create: jest.Mock; deleteMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { currentSession: { create: jest.fn(), deleteMany: jest.fn() } };
    const m: TestingModule = await Test.createTestingModule({
      providers: [
        CurrentSessionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    svc = m.get(CurrentSessionService);
  });

  it('start: creates when none exists', async () => {
    prisma.currentSession.create.mockResolvedValueOnce({ id: 'cs1' });
    const result = await svc.start(
      prisma as any,
      'c1',
      'FEEDING',
      's1',
      new Date(),
    );
    expect(result).toEqual({ id: 'cs1' });
  });

  it('start: throws 409 on unique-constraint conflict', async () => {
    prisma.currentSession.create.mockRejectedValueOnce({ code: 'P2002' });
    await expect(
      svc.start(prisma as any, 'c1', 'FEEDING', 's1', new Date()),
    ).rejects.toThrow(ConflictException);
  });

  it('end: deletes the matching row', async () => {
    prisma.currentSession.deleteMany.mockResolvedValueOnce({ count: 1 });
    await svc.end(prisma as any, 'c1', 'FEEDING');
    expect(prisma.currentSession.deleteMany).toHaveBeenCalledWith({
      where: { childId: 'c1', kind: 'FEEDING' },
    });
  });
});
