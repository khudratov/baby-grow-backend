import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { FamilyPerms, FamilyRole } from '@prisma/client';

export class CreateInviteDto {
  @IsEnum(FamilyRole)
  role!: FamilyRole;

  @IsEnum(FamilyPerms)
  perms!: FamilyPerms;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  expiresInHours?: number;
}
