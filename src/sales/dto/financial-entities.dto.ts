import { IsInt, IsPositive, IsString, MaxLength } from 'class-validator';

export class FinancialEntitiesDto {
  @IsInt()
  @IsPositive()
  id: number;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(10)
  code: string;
}
