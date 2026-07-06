import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateSaleDto, GenerateQrDto, GetQrCodeStatusDto } from './dto';
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
    return this.salesService.groups();
  }

  @MessagePattern('sales.productsGroup')
  async productsGroup(@Payload('groupId') groupId: number) {
    return this.salesService.productsGroup(groupId);
  }

  @MessagePattern('sales.financialEntities')
  async financialEntities() {
    return this.salesService.financialEntities();
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
  async forCreatingSale(@Payload('personUuid') personUuid: string) {
    return this.salesService.forCreatingSale(personUuid);
  }

  @MessagePattern('sales.generateQr')
  async generateQr(@Payload() data: GenerateQrDto) {
    return this.salesService.generateQr(data);
  }

  @MessagePattern('sales.createSale')
  async createSale(@Payload() data: CreateSaleDto) {
    return this.salesService.createSale(data);
  }

  @MessagePattern('sales.qrCodeStatus')
  async getQRCodeStatus(@Payload() data: GetQrCodeStatusDto) {
    return this.salesService.getQRCodeStatus(data);
  }

  @MessagePattern('sales.bcbPaymentNotification')
  async processBcbPaymentNotification(@Payload() data: any) {
    return this.salesService.processBcbPaymentNotification(data);
  }

  // Borrar despues de las pruebas
  @MessagePattern('sales.bcbPaymentNotificationPrueba')
  async processBcbPaymentNotificationPrueba(
    @Payload() data: GetQrCodeStatusDto,
  ) {
    return this.salesService.processBcbPaymentNotificationPrueba(data);
  }

  @MessagePattern('sales.personSales')
  async personSales(@Payload('personId') personId: number) {
    return this.salesService.personSales(personId);
  }

  @MessagePattern('sales.salesPendingReportByPerson')
  async salesPendingReportByPerson(@Payload('personId') personId: number) {
    return this.salesService.salesPendingReportByPerson(personId);
  }
}
