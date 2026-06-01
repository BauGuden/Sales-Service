import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NatsService } from 'src/common';
import { Repository } from 'typeorm';
import { Group, PaymentType, Product } from './entities';

@Injectable()
export class SalesService {
  private readonly logger = new Logger('SalesService');

  constructor(
    private readonly nats: NatsService,
    @InjectRepository(Group)
    private readonly groupsRepository: Repository<Group>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(PaymentType)
    private readonly paymentTypesRepository: Repository<PaymentType>,
  ) {}

  async searchPerson(value: string, type: string): Promise<{
    error: boolean;
    message: string;
    data: any | null;
  }> {
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
    data: any[] | null;
  }> {
    try {
      const groups = await this.groupsRepository.find({
        select: ['id', 'name', 'shortened', 'accountId'],
      });

      if (!groups || groups.length === 0) {
        return {
          error: false,
          message: 'Grupos obtenidos correctamente',
          data: [],
        };
      }

      // Extraer los accountId únicos de esos grupos, filtrando valores nulos o indefinidos
      const accountIds = [
        ...new Set(
          groups
            .map((g) => g.accountId)
            .filter((id) => id !== null && id !== undefined),
        ),
      ];

      const accountMap = new Map<number, { name: string; shortened: string }>();

      if (accountIds.length > 0) {
        try {
          // Enviar esos IDs en un solo mensaje NATS al microservicio Global para que devuelva los datos de las cuentas
          const response = await this.nats.firstValue('global.findAllAccountsByIds', {
            ids: accountIds,
            columns: ['id', 'name', 'shortened'],
          });

          if (response && response.serviceStatus && Array.isArray(response.data)) {
            response.data.forEach((acc: any) => {
              if (acc && acc.id !== undefined) {
                accountMap.set(acc.id, {
                  name: acc.name ?? null,
                  shortened: acc.shortened ?? null,
                });
              }
            });
          } else {
            this.logger.warn(
              'No se pudo obtener información de las cuentas o el formato de respuesta no fue correcto.',
            );
          }
        } catch (natsError) {
          this.logger.error(
            `Error al consultar cuentas vía NATS: ${natsError.message}`,
            natsError.stack,
          );
        }
      }

      // Combinar los datos de las cuentas con los grupos usando un mapa para que sea O(n)
      const enrichedGroups = groups.map((group) => {
        const account = accountMap.get(group.accountId);
        const { accountId, ...groupWithoutAccountId } = group;
        return {
          ...groupWithoutAccountId,
          accountName: account ? account.name : null,
          accountShortened: account ? account.shortened : null,
        };
      });

      return {
        error: false,
        message: 'Grupos obtenidos correctamente',
        data: enrichedGroups,
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

  async getProductsByGroup(groupId: number): Promise<{
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

  async getPaymentTypes(): Promise<{
    error: boolean;
    message: string;
    data: Pick<PaymentType, 'id' | 'name' | 'description' | 'shortened'>[] | null;
  }> {

    try {
      const paymentTypes = await this.paymentTypesRepository.find({
        select: ['id', 'name', 'description', 'shortened'],
      });
      return {
        error: false,
        message: 'Tipos de pago obtenidos correctamente',
        data: paymentTypes,
      };
    } catch (error) {
      this.logger.error(`Error al obtener tipos de pago: ${error.message}`, error.stack);
      return {
        error: true,
        message:
          'No se pudieron obtener los tipos de pago. Verifique la conexión o la existencia de la tabla.',
        data: null,
      };
    }

  }

  async getAccounts(): Promise<{
    error: boolean;
    message: string;
    data: any[] | null;
  }> {
    try {
      const { serviceStatus, error, message, data } = await this.nats.firstValue(
        'global.getAccounts',
        {},
      );

      if (!serviceStatus) {
        return {
          error: true,
          message: 'Servicio de cuentas no disponible',
          data: null,
        };
      }

      return {
        error,
        message,
        data: data ?? null,
      };
    } catch (error) {
      this.logger.error(`Error en getAccounts: ${error.message}`, error.stack);
      return {
        error: true,
        message: 'Error al comunicarse con el servicio de cuentas',
        data: null,
      };
    }
  }

  async getDataForSale(): Promise<{
    error: boolean;
    message: string;
    data: {
      paymentTypes: Pick<PaymentType, 'id' | 'name' | 'description' | 'shortened'>[] | null;
      paymentLocations: any[] | null;
    } | null;
  }> {
    try {
      const [paymentTypesResult, paymentLocationsResult] =
        await Promise.all([
          this.getPaymentTypes(),
          this.getPaymentLocations(),
        ]);

      const error = paymentTypesResult.error || paymentLocationsResult.error;

      if (error) {
        const messages = [
          paymentTypesResult.error ? paymentTypesResult.message : null,
          paymentLocationsResult.error ? paymentLocationsResult.message : null,
        ].filter(Boolean).join('; ');

        return {
          error: true,
          message: `Error al obtener datos para la venta: ${messages}`,
          data: null,
        };
      }

      return {
        error: false,
        message: 'Datos para la venta obtenidos correctamente',
        data: {
          paymentTypes: paymentTypesResult.data,
          paymentLocations: paymentLocationsResult.data,
        },
      };
    } catch (error) {
      this.logger.error(`Error en getDataForSale: ${error.message}`, error.stack);
      return {
        error: true,
        message: 'Error al obtener datos para la venta',
        data: null,
      };
    }
  }

}
