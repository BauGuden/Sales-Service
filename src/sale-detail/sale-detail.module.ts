import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleDetailController } from './sale-detail.controller';
import { SaleDetailService } from './sale-detail.service';
import { SaleDetail } from './entities/sale-detail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SaleDetail])],
  controllers: [SaleDetailController],
  providers: [SaleDetailService],
  exports: [SaleDetailService],
})
export class SaleDetailModule {}
