import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { DiaperKind } from '@prisma/client';

export class UpdateDiaperDto {
  @IsOptional() @IsDateString() at?: string;
  @IsOptional() @IsEnum(DiaperKind) kind?: DiaperKind;
  @IsOptional() @IsString() @Length(1, 200) note?: string;
}
