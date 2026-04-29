import { IsNotEmpty, IsString, IsNumber, IsArray } from 'class-validator';
import { CreateSaleDetailDto } from '../../sale-detail/dto/create-sale-detail.dto';

export class CreateSaleDto {
  // PAGADOR
  @IsString()
  @IsNotEmpty()
  customer_name: string;

  @IsString()
  @IsNotEmpty()
  customer_ci: string;

  // BENEFICIARIO (Solo CI, el nombre se busca en NATS)
  @IsString()
  @IsNotEmpty()
  affiliate_ci: string;

  // PAGO
  @IsNumber()
  @IsNotEmpty()
  payment_type_id: number;

  @IsNumber()
  @IsNotEmpty()
  payment_location_id: number;

  voucher_number?: string;

  // PRODUCTOS
  @IsArray()
  @IsNotEmpty()
  details: CreateSaleDetailDto[];
}