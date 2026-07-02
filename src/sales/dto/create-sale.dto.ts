import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateSaleProductDto {
  @IsInt()
  @IsPositive()
  productId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @IsNumberString()
  price: string;

  @IsInt()
  @IsPositive()
  amount: number;
}

export class CreateSaleVoucherDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  customer: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  identityCardCustomer: string;

  @IsInt()
  @IsPositive()
  paymentLocationId: number;

  @IsDateString()
  depositDate: string;
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

  @ValidateNested()
  @Type(() => CreateSaleVoucherDto)
  voucher: CreateSaleVoucherDto;
}
