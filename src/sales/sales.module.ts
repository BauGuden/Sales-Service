import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Group, Parameter, Product, Sale, SaleProduct } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleProduct, Product, Parameter, Group])],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
