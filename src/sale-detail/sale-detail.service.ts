import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaleDetail } from './entities/sale-detail.entity';

@Injectable()
export class SaleDetailService {
  constructor(
    @InjectRepository(SaleDetail)
    private readonly saleDetailRepository: Repository<SaleDetail>,
  ) {}

  findBySale(saleId: number) {
    return this.saleDetailRepository.find({
      where: { sale: { id: saleId } },
    });
  }
}