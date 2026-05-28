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

  @MessagePattern('sales.groups')
  async getGroups() {
    return this.salesService.getGroups();
  }
  
  @MessagePattern('sales.getGroupProducts')
  async getProductsbyGroup(@Payload('id') groupId: number) {
    return this.salesService.getProductsByGroup(groupId);
  }

  @MessagePattern('sales.getPaymentLocations')
  async getPaymentLocations() {
    return this.salesService.getPaymentLocations();
  }

  @MessagePattern('sales.getPaymentTypes')
  async getPaymentTypes() {
    return this.salesService.getPaymentTypes();
  }

  @MessagePattern('sales.getAccounts')
  async getAccounts() {
    return this.salesService.getAccounts();
  }

  @MessagePattern('sales.getDataForSale')
  async getDataForSale() {
    return this.salesService.getDataForSale();
  }

}
