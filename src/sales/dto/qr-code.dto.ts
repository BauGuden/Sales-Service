import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BcbQrDataDto } from './create-sale.dto';

export class GetQrCodeDto {
  @IsInt()
  @IsPositive()
  saleId: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => BcbQrDataDto)
  qrData?: BcbQrDataDto;
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
