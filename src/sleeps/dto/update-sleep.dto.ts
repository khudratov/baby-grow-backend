import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class UpdateSleepDto {
  @IsOptional() @IsDateString() startedAt?: string;
  @IsOptional() @IsDateString() endedAt?: string;
  @IsOptional() @IsString() @Length(1, 200) note?: string;
}
