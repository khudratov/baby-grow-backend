import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { MilestoneStatus } from '@prisma/client';

export class CreateMilestoneCompletionDto {
  @IsUUID() catalogMilestoneId!: string;
  @IsEnum(MilestoneStatus) status!: MilestoneStatus;
  @IsOptional() @IsDateString() completedAt?: string;
  @IsOptional() @IsString() @Length(1, 500) note?: string;
}
