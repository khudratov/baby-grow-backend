import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { MilestoneStatus } from '@prisma/client';

export class UpdateMilestoneCompletionDto {
  @IsOptional() @IsEnum(MilestoneStatus) status?: MilestoneStatus;
  @IsOptional() @IsDateString() completedAt?: string;
  @IsOptional() @IsString() @Length(1, 500) note?: string;
}
