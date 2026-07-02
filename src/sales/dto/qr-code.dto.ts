import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SaleProductDto } from './create-sale.dto';

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

export class GenerateQrDto {
  @IsInt()
  @IsPositive()
  personId: number;

  @IsInt()
  @IsPositive()
  paymentTypeId: number;

  @IsInt()
  @IsPositive()
  parameterId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleProductDto)
  saleProducts: SaleProductDto[];
}

export class GetQrCodeStatusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  qrId: string;
}
