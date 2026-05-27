import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NatsService } from 'src/common';
import { Repository } from 'typeorm';
import { Group, Product } from './entities';

@Injectable()
export class SalesService {
  private readonly logger = new Logger('SalesService');

  constructor(
    private readonly nats: NatsService,
    @InjectRepository(Group)
    private readonly groupsRepository: Repository<Group>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async searchPerson(value: string, type: string) {
    try {
      const { serviceStatus, error, message, data } = await this.nats.firstValue(
        'person.search',
        { value, type },
      );

      if (!serviceStatus) {
        return {
          error: true,
          message: 'Servicio de Beneficiarios no disponible',
          data: null,
        };
      }

      return {
        error,
        message,
        data: data ?? null,
      };
    } catch (error) {
      this.logger.error(`Error en searchPerson: ${error.message}`, error.stack);
      return {
        error: true,
        message: 'Error al comunicarse con el servicio de búsqueda de personas',
        data: null,
      };
    }
  }

  async getGroups(): Promise<{
    error: boolean;
    message: string;
    data: Pick<Group, 'id' | 'name' | 'shortened'>[] | null;
  }> {
    try {
      const groups = await this.groupsRepository.find({
        select: ['id', 'name', 'shortened'],
      });
      return {
        error: false,
        message: 'Grupos obtenidos correctamente',
        data: groups,
      };
    } catch (error) {
      this.logger.error(`Error al obtener grupos: ${error.message}`, error.stack);
      return {
        error: true,
        message:
          'No se pudieron obtener los grupos. Verifique la conexión o la existencia de la tabla.',
        data: null,
      };
    }
  }

  async getProductsbyGroup(groupId: number): Promise<{
    error: boolean;
    message: string;
    data: Pick<Product, 'id' | 'name' | 'code' | 'price'>[] | null;
  }> {
    try {
      if (!groupId || Number.isNaN(Number(groupId))) {
        return {
          error: true,
          message: 'El id del grupo es requerido',
          data: null,
        };
      }

      const products = await this.productsRepository.find({
        where: { group: { id: groupId } },
        select: ['id', 'name', 'code', 'price'],
      });

      if (!products.length) {
        return {
          error: true,
          message: 'No se encontraron productos para el grupo',
          data: null,
        };
      }

      return {
        error: false,
        message: 'Productos obtenidos correctamente',
        data: products,
      };
    } catch (error) {
      this.logger.error(`Error al obtener productos por grupo ${groupId}: ${error.message}`, error.stack);
      return {
        error: true,
        message:
          'No se pudieron obtener los productos por grupo. Verifique la conexión o la existencia de la tabla.',
        data: null,
      };
    }
  }

  async getPaymentLocations(): Promise<{
    error: boolean;
    message: string;
    data: any[] | null;
  }> {
    try {
      const { serviceStatus, error, message, data } = await this.nats.firstValue(
        'global.getPaymentLocations',
        {},
      );

      if (!serviceStatus) {
        return {
          error: true,
          message: 'Servicio de ubicaciones de pago no disponible',
          data: null,
        };
      }

      return {
        error,
        message,
        data: data ?? null,
      };
    } catch (error) {
      this.logger.error(`Error en getPaymentLocations: ${error.message}`, error.stack);
      return {
        error: true,
        message: 'Error al comunicarse con el servicio de ubicaciones de pago',
        data: null,
      };
    }
  }
}
