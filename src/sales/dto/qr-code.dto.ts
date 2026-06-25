import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateSaleProductDto } from './create-sale.dto';

export class GenerateQrDto {
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

export class GetQrCodeStatusDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  saleId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  voucherId?: number;

  @IsOptional()
  @IsString()
  qrId?: string;
}
