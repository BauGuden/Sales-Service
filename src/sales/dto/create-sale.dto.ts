import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateSaleDetailDto } from './create-sale-detail.dto';

export class CreateSaleDto {
  @IsString()
  @IsNotEmpty()
  customer: string;

  @IsString()
  @IsNotEmpty()
  identityCard: string;

  @IsInt()
  @IsNotEmpty()
  paymentTypeId: number;

  @IsInt()
  @IsNotEmpty()
  paymentLocationId: number;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleDetailDto)
  saleProducts: CreateSaleDetailDto[];
}
