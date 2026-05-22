import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SalesService } from './sales.service';

@Controller()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @MessagePattern('sales.searchPerson')
  async searchPerson(
    @Payload('value') value: string,
    @Payload('type') type: string,
  ) {
    return this.salesService.searchPerson(value, type);
  }
}
