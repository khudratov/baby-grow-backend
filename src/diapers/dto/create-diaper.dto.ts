import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { DiaperKind } from '@prisma/client';

export class CreateDiaperDto {
  @IsDateString() at!: string;
  @IsEnum(DiaperKind) kind!: DiaperKind;
  @IsOptional() @IsString() @Length(1, 200) note?: string;
}
