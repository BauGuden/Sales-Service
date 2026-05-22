import { Injectable } from '@nestjs/common';
import { NatsService } from 'src/common';

@Injectable()
export class SalesService {
  constructor(private readonly nats: NatsService) {}

  async searchPerson(value: string, type: string) {
    return this.nats.firstValue('person.searchSales', { value, type });
  }
}
