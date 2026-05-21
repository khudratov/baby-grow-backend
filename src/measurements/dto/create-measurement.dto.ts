import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateMeasurementDto {
  @IsDateString() at!: string;
  @IsOptional() @IsNumber() @Min(0) @Max(200) weightKg?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(250) heightCm?: number;
  @IsOptional() @IsString() @Length(1, 200) note?: string;
}
