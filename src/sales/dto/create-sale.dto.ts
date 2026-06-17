import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDecimal,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateSaleProductDto {
  @IsInt()
  @IsPositive()
  id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  price: string;

  @IsInt()
  @IsPositive()
  amount: number;
}

export class CreateSaleDto {
  @IsUUID()
  personUuid: string;

  @IsInt()
  @IsPositive()
  paymentTypeId: number;

  @IsInt()
  @IsPositive()
  parameterId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleProductDto)
  saleProducts: CreateSaleProductDto[];
}
