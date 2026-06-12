import {
  IsBoolean,
  IsInt,
  IsNumberString,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class ParameterDataDto {
  @IsInt()
  @IsPositive()
  id: number;

  @IsNumberString()
  maxAmountProducts: string;

  @IsInt()
  @IsPositive()
  maxProducts: number;

  @IsString()
  @MaxLength(4)
  currencySymbol: string;

  @IsBoolean()
  isActive: boolean;
}
