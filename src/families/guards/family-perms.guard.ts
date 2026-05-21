import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { FAMILY_ACCESS_TIER_KEY } from '../decorators/require-family-access.decorator';
import {
  FamilyAccessTier,
  FamilyPerms,
  FamilyRole,
} from '../types/family-role-perms';

@Injectable()
export class FamilyPermsGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tier = this.reflector.getAllAndOverride<FamilyAccessTier>(
      FAMILY_ACCESS_TIER_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!tier) return true;

    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.id;
    if (!userId) throw new NotFoundException('Family not found');

    const familyId = await this.resolveFamilyId(req);
    if (!familyId) throw new NotFoundException('Family not found');

    const membership = await this.prisma.familyMembership.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!membership) throw new NotFoundException('Family not found');

    if (tier === 'read' || tier === 'tracker') {
      req.familyMembership = membership;
      return true;
    }

    if (tier === 'photos') {
      if (
        membership.perms === FamilyPerms.FULL ||
        membership.perms === FamilyPerms.TRACKER_PHOTOS
      ) {
        req.familyMembership = membership;
        return true;
      }
      throw new ForbiddenException('Insufficient family permissions');
    }

    if (tier === 'primary') {
      if (membership.role === FamilyRole.PRIMARY_PARENT) {
        req.familyMembership = membership;
        return true;
      }
      throw new ForbiddenException('Insufficient family permissions');
    }

    throw new ForbiddenException('Insufficient family permissions');
  }

  private async resolveFamilyId(req: any): Promise<string | null> {
    if (req.params?.familyId) return req.params.familyId;

    if (req.params?.childId) {
      const child = await this.prisma.child.findUnique({
        where: { id: req.params.childId },
        select: { familyId: true },
      });
      return child?.familyId ?? null;
    }

    // Indirect via per-entity id (feeding, sleep, etc.) — resolved per controller via the entity's own service.
    // The decorator on the route can also set a `resolveFromEntity` param; for now we only support direct + childId.
    return null;
  }
}
