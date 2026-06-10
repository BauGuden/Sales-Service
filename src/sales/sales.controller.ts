import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SalesService } from './sales.service';
import { UUID } from 'node:crypto';

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

  @MessagePattern('sales.groups')
  async getGroups() {
    return this.salesService.groups();
  }
  
  @MessagePattern('sales.productsGroup')
  async productsGroup(@Payload('groupId') groupId: number) {
    return this.salesService.productsGroup(groupId);
  }

  @MessagePattern('sales.paymentLocations')
  async paymentLocations() {
    return this.salesService.paymentLocations();
  }

  @MessagePattern('sales.paymentTypes')
  async paymentTypes() {
    return this.salesService.paymentTypes();
  }

  @MessagePattern('sales.accounts')
  async accounts() {
    return this.salesService.accounts();
  }

  @MessagePattern('sales.dataForSale')
  async dataForSale() {
    return this.salesService.dataForSale();
  }

  @MessagePattern('sales.forCreatingSale')
  async forCreatingSale(@Payload('personUuid') personUuid: UUID) {
    return this.salesService.forCreatingSale(personUuid);
  }

}
