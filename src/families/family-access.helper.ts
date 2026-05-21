// src/families/family-access.helper.ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FamilyPerms, FamilyRole, PrismaClient } from '@prisma/client';
import { FamilyAccessTier } from './types/family-role-perms';

export async function assertFamilyAccessForChild(
  prisma: PrismaClient,
  userId: string,
  childId: string,
  tier: FamilyAccessTier,
) {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { familyId: true },
  });
  if (!child) throw new NotFoundException('Child not found');

  const membership = await prisma.familyMembership.findUnique({
    where: { familyId_userId: { familyId: child.familyId, userId } },
  });
  if (!membership) throw new NotFoundException('Child not found');

  if (tier === 'read' || tier === 'tracker') return membership;
  if (tier === 'photos') {
    if (
      membership.perms === FamilyPerms.FULL ||
      membership.perms === FamilyPerms.TRACKER_PHOTOS
    ) {
      return membership;
    }
    throw new ForbiddenException('Insufficient family permissions');
  }
  if (tier === 'primary') {
    if (membership.role === FamilyRole.PRIMARY_PARENT) return membership;
    throw new ForbiddenException('Insufficient family permissions');
  }
  throw new ForbiddenException('Insufficient family permissions');
}

export async function assertFamilyAccessForEntity(
  prisma: PrismaClient,
  userId: string,
  entity: { childId: string } | null,
  tier: FamilyAccessTier,
) {
  if (!entity) throw new NotFoundException('Not found');
  return assertFamilyAccessForChild(prisma, userId, entity.childId, tier);
}
