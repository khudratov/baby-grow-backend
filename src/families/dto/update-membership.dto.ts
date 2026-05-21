import { IsEnum, IsOptional } from 'class-validator';
import { FamilyPerms, FamilyRole } from '@prisma/client';

export class UpdateMembershipDto {
  @IsOptional()
  @IsEnum(FamilyRole)
  role?: FamilyRole;

  @IsOptional()
  @IsEnum(FamilyPerms)
  perms?: FamilyPerms;
}
