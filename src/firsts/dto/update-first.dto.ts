import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class UpdateFirstDto {
  @IsOptional() @IsString() @Length(1, 100) title?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() @Length(1, 500) note?: string;
}
