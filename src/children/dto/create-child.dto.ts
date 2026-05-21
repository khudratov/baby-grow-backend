import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class CreateChildDto {
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  sex?: string;

  @IsDateString()
  birthday!: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
