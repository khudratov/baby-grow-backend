import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { DiaperKind, DiaperVia } from '@prisma/client';

export class UpdateDiaperDto {
  @IsOptional() @IsDateString() at?: string;
  @IsOptional() @IsEnum(DiaperKind) kind?: DiaperKind;
  @IsOptional() @IsEnum(DiaperVia) via?: DiaperVia;
  @IsOptional() @IsString() @Length(1, 200) note?: string;
}
