import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateSaleProductDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  id?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  productId?: number;

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

export class BcbQrDataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  titularDestinatario: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  ciNitDestinatario: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  eif: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cuentaDestino: string;

  @IsOptional()
  @IsObject()
  cuentaDestinoDistribucion?: Record<string, number>;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  codMoneda: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  glosa?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(19)
  fechaVencimiento: string;

  @IsBoolean()
  unicoUso: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  codigoServicio: string;

  @IsOptional()
  @IsObject()
  metaData?: Record<string, unknown>;
}

export class CreateSaleVoucherDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  customer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  identityCardCustomer?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  paymentLocationId?: number;

  @IsOptional()
  @IsDateString()
  depositDate?: string;
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

  @IsOptional()
  @ValidateNested()
  @Type(() => BcbQrDataDto)
  qrData?: BcbQrDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSaleVoucherDto)
  voucher?: CreateSaleVoucherDto;

  @IsOptional()
  @IsString()
  qrId?: string;

  @IsOptional()
  @IsString()
  bcbQrId?: string;

  @IsOptional()
  @IsString()
  qrImage?: string;

  @IsOptional()
  @IsObject()
  qrResponse?: Record<string, unknown>;
}
