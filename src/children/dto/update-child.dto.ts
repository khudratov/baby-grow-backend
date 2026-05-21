import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class UpdateChildDto {
  @IsOptional() @IsString() @Length(1, 80) name?: string;
  @IsOptional() @IsString() @Length(1, 20) sex?: string;
  @IsOptional() @IsDateString() birthday?: string;
  @IsOptional() @IsString() avatarUrl?: string;
}
