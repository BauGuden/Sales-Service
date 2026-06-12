import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ForCreatingSaleDto, ProductsGroupDto, SearchPersonDto } from './dto';
import { SalesService } from './sales.service';

@Controller()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @MessagePattern('sales.searchPerson')
  async searchPerson(@Payload() searchPersonDto: SearchPersonDto) {
    return this.salesService.searchPerson(
      searchPersonDto.value,
      searchPersonDto.type,
    );
  }

  @MessagePattern('sales.groups')
  async getGroups() {
    return this.salesService.groups();
  }

  @MessagePattern('sales.productsGroup')
  async productsGroup(@Payload() productsGroupDto: ProductsGroupDto) {
    return this.salesService.productsGroup(productsGroupDto.groupId);
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
  async forCreatingSale(@Payload() forCreatingSaleDto: ForCreatingSaleDto) {
    return this.salesService.forCreatingSale(forCreatingSaleDto.personUuid);
  }
}
