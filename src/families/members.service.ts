import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FamilyPerms, FamilyRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(familyId: string) {
    return this.prisma.familyMembership.findMany({
      where: { familyId },
      include: { user: { select: { email: true, displayName: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async update(
    familyId: string,
    targetUserId: string,
    changes: { role?: FamilyRole; perms?: FamilyPerms },
  ) {
    const membership = await this.prisma.familyMembership.findUnique({
      where: { familyId_userId: { familyId, userId: targetUserId } },
    });
    if (!membership) throw new NotFoundException('Member not found');

    // Demoting the last primary parent → 409
    if (
      changes.role &&
      changes.role !== FamilyRole.PRIMARY_PARENT &&
      membership.role === FamilyRole.PRIMARY_PARENT
    ) {
      const otherPrimary = await this.prisma.familyMembership.count({
        where: {
          familyId,
          role: FamilyRole.PRIMARY_PARENT,
          NOT: { userId: targetUserId },
        },
      });
      if (otherPrimary === 0) {
        throw new ConflictException('Cannot remove the last primary parent');
      }
    }

    return this.prisma.familyMembership.update({
      where: { familyId_userId: { familyId, userId: targetUserId } },
      data: changes,
    });
  }

  async remove(familyId: string, targetUserId: string, callerUserId: string) {
    if (targetUserId === callerUserId) {
      throw new ConflictException(
        'Cannot remove yourself; leave via PATCH or another primary parent',
      );
    }
    const membership = await this.prisma.familyMembership.findUnique({
      where: { familyId_userId: { familyId, userId: targetUserId } },
    });
    if (!membership) throw new NotFoundException('Member not found');

    if (membership.role === FamilyRole.PRIMARY_PARENT) {
      const otherPrimary = await this.prisma.familyMembership.count({
        where: {
          familyId,
          role: FamilyRole.PRIMARY_PARENT,
          NOT: { userId: targetUserId },
        },
      });
      if (otherPrimary === 0) {
        throw new ConflictException('Cannot remove the last primary parent');
      }
    }

    await this.prisma.familyMembership.delete({
      where: { familyId_userId: { familyId, userId: targetUserId } },
    });
  }
}
