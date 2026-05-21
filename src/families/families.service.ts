import { Injectable, NotFoundException } from '@nestjs/common';
import { Family, FamilyPerms, FamilyRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FamiliesService {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(userId: string, name: string): Promise<Family> {
    return this.prisma.family.create({
      data: {
        name,
        memberships: {
          create: {
            userId,
            role: FamilyRole.PRIMARY_PARENT,
            perms: FamilyPerms.FULL,
          },
        },
      },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.family.findMany({
      where: { memberships: { some: { userId } } },
      include: {
        memberships: { where: { userId }, select: { role: true, perms: true } },
      },
    });
  }

  async findByIdOrThrow(
    familyId: string,
  ): Promise<Family & { memberships: any[] }> {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        memberships: {
          include: { user: { select: { email: true, displayName: true } } },
        },
      },
    });
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  async update(familyId: string, name: string): Promise<Family> {
    return this.prisma.family.update({
      where: { id: familyId },
      data: { name },
    });
  }

  async delete(familyId: string): Promise<void> {
    await this.prisma.family.delete({ where: { id: familyId } });
  }
}
