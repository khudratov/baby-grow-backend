// src/feedings/dto/update-feeding.dto.ts
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { BreastSide } from '@prisma/client';

export class UpdateFeedingDto {
  @IsOptional() @IsDateString() startedAt?: string;
  @IsOptional() @IsDateString() endedAt?: string;
  @IsOptional() @IsInt() @Min(0) @Max(7_200_000) leftMs?: number;
  @IsOptional() @IsInt() @Min(0) @Max(7_200_000) rightMs?: number;
  @IsOptional() @IsEnum(BreastSide) activeSide?: BreastSide;
  @IsOptional() @IsBoolean() paused?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(2000) volumeMl?: number;
  @IsOptional() @IsString() @Length(1, 200) foodNote?: string;
}
