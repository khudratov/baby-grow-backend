import { randomBytes } from 'crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FamilyInvite, FamilyPerms, FamilyRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    familyId: string,
    role: FamilyRole,
    perms: FamilyPerms,
    expiresInHours: number,
  ): Promise<FamilyInvite> {
    const code = randomBytes(16).toString('base64url');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    return this.prisma.familyInvite.create({
      data: { familyId, code, role, perms, expiresAt },
    });
  }

  async listActive(familyId: string): Promise<FamilyInvite[]> {
    return this.prisma.familyInvite.findMany({
      where: { familyId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(familyId: string, inviteId: string): Promise<void> {
    const invite = await this.prisma.familyInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.familyId !== familyId) {
      throw new NotFoundException('Invite not found');
    }
    await this.prisma.familyInvite.delete({ where: { id: inviteId } });
  }

  async redeem(code: string, userId: string) {
    const invite = await this.prisma.familyInvite.findUnique({
      where: { code },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.usedAt) throw new ConflictException('Invite already used');
    if (invite.expiresAt < new Date())
      throw new ConflictException('Invite expired');

    const existing = await this.prisma.familyMembership.findUnique({
      where: { familyId_userId: { familyId: invite.familyId, userId } },
    });
    if (existing)
      throw new ConflictException('Already a member of this family');

    return this.prisma.$transaction(async tx => {
      const membership = await tx.familyMembership.create({
        data: {
          familyId: invite.familyId,
          userId,
          role: invite.role,
          perms: invite.perms,
        },
      });
      await tx.familyInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), usedById: userId },
      });
      return membership;
    });
  }
}
