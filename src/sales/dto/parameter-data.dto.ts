import {
  IsBoolean,
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class ParameterDataDto {
  @IsInt()
  @IsPositive()
  id: number;

  @IsInt()
  maxAmountProduct: number;

  @IsInt()
  @IsPositive()
  maxProducts: number;

  @IsString()
  @MaxLength(4)
  currencySymbol: string;

  @IsBoolean()
  isActive: boolean;
}
