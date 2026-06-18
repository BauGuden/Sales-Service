import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsArray,
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
}
