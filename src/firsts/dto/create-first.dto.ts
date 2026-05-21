import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class CreateFirstDto {
  @IsString() @Length(1, 100) title!: string;
  @IsDateString() date!: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() @Length(1, 500) note?: string;
}
