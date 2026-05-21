import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { VaccineStatus } from '@prisma/client';

export class UpdateVaccineDoseDto {
  @IsOptional() @IsEnum(VaccineStatus) status?: VaccineStatus;
  @IsOptional() @IsDateString() givenAt?: string;
  @IsOptional() @IsDateString() scheduledFor?: string;
  @IsOptional() @IsString() @Length(1, 200) location?: string;
}
