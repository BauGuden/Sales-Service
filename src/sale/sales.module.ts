import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { Sale } from './entities/sale.entity';
import { ParametersModule } from 'src/parameters/parameter.module';
import { ProductModule } from 'src/product/product.module';
import { SaleDetailModule } from 'src/sale-detail/sale-detail.module';
import { SaleDetail } from 'src/sale-detail/entities/sale-detail.entity';
import { Product } from 'src/product/entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sale,SaleDetail,Product]),ProductModule, ParametersModule, SaleDetailModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
