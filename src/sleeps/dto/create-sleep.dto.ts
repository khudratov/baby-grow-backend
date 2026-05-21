import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { SleepKind } from '@prisma/client';

export class CreateSleepDto {
  @IsEnum(SleepKind) kind!: SleepKind;
  @IsDateString() startedAt!: string;
  @IsOptional() @IsDateString() endedAt?: string;
  @IsOptional() @IsString() @Length(1, 200) note?: string;
}
