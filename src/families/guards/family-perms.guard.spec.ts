import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { FamilyPermsGuard } from './family-perms.guard';

function mockContext(opts: {
  user?: { id: string };
  params?: Record<string, string>;
  metadata?: string;
}): ExecutionContext {
  const req: any = { user: opts.user, params: opts.params ?? {} };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

describe('FamilyPermsGuard', () => {
  let guard: FamilyPermsGuard;
  let prisma: {
    familyMembership: { findUnique: jest.Mock };
    child: { findUnique: jest.Mock };
  };
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    prisma = {
      familyMembership: { findUnique: jest.fn() },
      child: { findUnique: jest.fn() },
    };
    reflector = { getAllAndOverride: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyPermsGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();
    guard = module.get(FamilyPermsGuard);
  });

  it('1. no membership → 404', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce('read');
    prisma.familyMembership.findUnique.mockResolvedValueOnce(null);
    const ctx = mockContext({ user: { id: 'u1' }, params: { familyId: 'f1' } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
  });

  it('2. read tier with any membership → pass', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce('read');
    prisma.familyMembership.findUnique.mockResolvedValueOnce({
      role: 'COPARENT',
      perms: 'TRACKER_ONLY',
    });
    const ctx = mockContext({ user: { id: 'u1' }, params: { familyId: 'f1' } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('3. photos tier with TRACKER_ONLY → 403', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce('photos');
    prisma.familyMembership.findUnique.mockResolvedValueOnce({
      role: 'NANNY',
      perms: 'TRACKER_ONLY',
    });
    const ctx = mockContext({ user: { id: 'u1' }, params: { familyId: 'f1' } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('4. photos tier with TRACKER_PHOTOS → pass', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce('photos');
    prisma.familyMembership.findUnique.mockResolvedValueOnce({
      role: 'GRANDMA',
      perms: 'TRACKER_PHOTOS',
    });
    const ctx = mockContext({ user: { id: 'u1' }, params: { familyId: 'f1' } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('5. primary tier with COPARENT role → 403', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce('primary');
    prisma.familyMembership.findUnique.mockResolvedValueOnce({
      role: 'COPARENT',
      perms: 'FULL',
    });
    const ctx = mockContext({ user: { id: 'u1' }, params: { familyId: 'f1' } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
