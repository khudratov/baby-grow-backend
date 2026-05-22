import { IsInt, Max, Min } from 'class-validator';

export class SetDiaperStockDto {
  @IsInt()
  @Min(0)
  @Max(10000)
  stock!: number;
}
