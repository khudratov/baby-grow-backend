import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { VaccineStatus } from '@prisma/client';

export class CreateVaccineDoseDto {
  @IsUUID() catalogVaccineId!: string;
  @IsEnum(VaccineStatus) status!: VaccineStatus;
  @IsOptional() @IsDateString() givenAt?: string;
  @IsOptional() @IsDateString() scheduledFor?: string;
  @IsOptional() @IsString() @Length(1, 200) location?: string;
}
