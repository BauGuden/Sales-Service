import {
  IsInt,
  IsNumberString,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class ProductDataDto {
  @IsInt()
  @IsPositive()
  id: number;

  @IsString()
  @MaxLength(150)
  name: string;

  @IsString()
  @MaxLength(20)
  code: string;

  @IsNumberString()
  price: string;
}
