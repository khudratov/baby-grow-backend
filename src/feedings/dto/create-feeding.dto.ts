// src/feedings/dto/create-feeding.dto.ts
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { FeedingKind } from '@prisma/client';

export class CreateFeedingDto {
  @IsEnum(FeedingKind) kind!: FeedingKind;
  @IsDateString() startedAt!: string;
  @IsOptional() @IsDateString() endedAt?: string;
  @IsOptional() @IsInt() @Min(0) @Max(7_200_000) leftMs?: number;
  @IsOptional() @IsInt() @Min(0) @Max(7_200_000) rightMs?: number;
  @IsOptional() @IsInt() @Min(0) @Max(2000) volumeMl?: number;
  @IsOptional() @IsString() @Length(1, 200) foodNote?: string;
}
