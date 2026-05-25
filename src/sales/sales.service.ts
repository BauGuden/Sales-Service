import { HttpStatus, Injectable } from '@nestjs/common';
import { NatsService } from 'src/common';

@Injectable()
export class SalesService {
  constructor(private readonly nats: NatsService) {}

  async searchPerson(value: string, type: string) {
    const { serviceStatus, error, message, data } = await this.nats.firstValue(
      'person.searchSales',
      { value, type },
    );

    if (!serviceStatus) {
      return {
        error: true,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Servicio de Beneficiarios no disponible',
        data: null,
      };
    }

    return {
      error,
      statusCode: error ? HttpStatus.BAD_REQUEST : HttpStatus.OK,
      message,
      data: data ?? null,
    };
  }
}
