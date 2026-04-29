import { Controller, Get, Param } from '@nestjs/common';
import { SaleDetailService } from './sale-detail.service';

@Controller('sale-details')
export class SaleDetailController {
  constructor(private readonly saleDetailService: SaleDetailService) {}

  @Get('sale/:saleId')
  findBySale(@Param('saleId') saleId: string) {
    return this.saleDetailService.findBySale(+saleId);
  }
}