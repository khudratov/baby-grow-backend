import { SetMetadata } from '@nestjs/common';
import { FamilyAccessTier } from '../types/family-role-perms';

export const FAMILY_ACCESS_TIER_KEY = 'familyAccessTier';

export const RequireFamilyAccess = (tier: FamilyAccessTier) =>
  SetMetadata(FAMILY_ACCESS_TIER_KEY, tier);
