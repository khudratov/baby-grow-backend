import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateFamilyDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;
}
