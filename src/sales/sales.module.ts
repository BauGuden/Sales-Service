import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import {
  Group,
  Parameter,
  PaymentType,
  Product,
  QrPayment,
  Sale,
  SaleProduct,
  Voucher,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleProduct,
      Product,
      Parameter,
      Group,
      PaymentType,
      Voucher,
      QrPayment,
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
