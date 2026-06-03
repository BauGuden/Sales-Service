import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NatsService } from 'src/common';
import { Repository } from 'typeorm';
import { Group, PaymentType, Product } from './entities';

type SearchPersonData = {
  uuidColum: string;
};

type PersonForCreatingSaleData = {
  uuidColumn: string;
  fullName: string;
  identityCard: string;
  nup: number | null;
  isPolice: boolean;
};

type GroupData = Pick<Group, 'id' | 'name' | 'shortened'> & {
  accountName: string | null;
  accountShortened: string | null;
};

type AccountLookupData = {
  id: number;
  name: string | null;
  shortened: string | null;
};

type PaymentLocationData = {
  id: number;
  name: string;
  code: string;
};

type AccountData = {
  id: number;
  eif: string;
  name: string;
  accountNumber: string;
};

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
    data: SearchPersonData | null;
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

  async groups(): Promise<{
    error: boolean;
    message: string;
    data: GroupData[] | null;
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

      const accountMap = new Map<number, { name: string | null; shortened: string | null }>();

      if (accountIds.length > 0) {
        try {
          // Enviar esos IDs en un solo mensaje NATS al microservicio Global para que devuelva los datos de las cuentas
          const response = await this.nats.firstValue('global.findAllAccountsByIds', {
            ids: accountIds,
            columns: ['id', 'name', 'shortened'],
          });

          if (response && response.serviceStatus && Array.isArray(response.data)) {
            response.data.forEach((acc: AccountLookupData) => {
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

  async productsGroup(groupId: number): Promise<{
    error: boolean;
    message: string;
    data: Pick<Product, 'id' | 'name' | 'code' | 'price'>[] | null;
  }> {
    try {
      const parsedGroupId = Number(groupId);

      if (!Number.isInteger(parsedGroupId) || parsedGroupId <= 0) {
        return {
          error: true,
          message: 'El id del grupo debe ser un número entero mayor a cero',
          data: null,
        };
      }

      const group = await this.groupsRepository.findOne({
        where: { id: parsedGroupId },
        select: ['id'],
      });

      if (!group) {
        return {
          error: true,
          message: `El grupo con id ${parsedGroupId} no existe`,
          data: null,
        };
      }

      const products = await this.productsRepository.find({
        where: { group: { id: parsedGroupId } },
        select: ['id', 'name', 'code', 'price'],
      });

      if (!products.length) {
        return {
          error: false,
          message: `El grupo con id ${parsedGroupId} no contiene productos`,
          data: [],
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

  async paymentLocations(): Promise<{
    error: boolean;
    message: string;
    data: PaymentLocationData[] | null;
  }> {
    try {
      const { serviceStatus, error, message, data } = await this.nats.firstValue(
        'global.paymentLocations',
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
        error: error ?? false,
        message: message ?? 'Ubicaciones de pago obtenidas correctamente',
        data: data ?? null,
      };
    } catch (error) {
      this.logger.error(`Error en paymentLocations: ${error.message}`, error.stack);
      return {
        error: true,
        message: 'Error al comunicarse con el servicio de ubicaciones de pago',
        data: null,
      };
    }
  }

  async paymentTypes(): Promise<{
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

  async accounts(): Promise<{
    error: boolean;
    message: string;
    data: AccountData[] | null;
  }> {
    try {
      const { serviceStatus, error, message, data } = await this.nats.firstValue(
        'global.accounts',
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
      this.logger.error(`Error en accounts: ${error.message}`, error.stack);
      return {
        error: true,
        message: 'Error al comunicarse con el servicio de cuentas',
        data: null,
      };
    }
  }

  async dataForSale(): Promise<{
    error: boolean;
    message: string;
    data: {
      paymentTypes: Pick<PaymentType, 'id' | 'name' | 'description' | 'shortened'>[] | null;
      paymentLocations: PaymentLocationData[] | null;
    } | null;
  }> {
    try {
      const [paymentTypesResult, paymentLocationsResult] =
        await Promise.all([
          this.paymentTypes(),
          this.paymentLocations(),
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
      this.logger.error(`Error en dataForSale: ${error.message}`, error.stack);
      return {
        error: true,
        message: 'Error al obtener datos para la venta',
        data: null,
      };
    }
  }

  async forCreatingSale(personUuid: string): Promise<{
    error: boolean;
    message: string;
    data: {
      person: PersonForCreatingSaleData;
    } | null;
  }> {
    try {
      if (!personUuid) {
        return {
          error: true,
          message: 'El uuid de la persona es requerido',
          data: null,
        };
      }

      const {
        serviceStatus,
        firstName,
        secondName,
        lastName,
        mothersLastName,
        identityCard,
        nup,
        features,
      } = await this.nats.firstValue('person.findOneWithFeatures', {
        uuid: personUuid,
      });

      if (!serviceStatus) {
        return {
          error: true,
          message: 'Servicio de Beneficiarios no disponible',
          data: null,
        };
      }

      return {
        error: false,
        message: 'Datos de la persona obtenidos correctamente',
        data: {
          person: {
            uuidColumn: personUuid,
            fullName: [firstName, secondName, lastName, mothersLastName].filter(Boolean).join(' '),
            identityCard,
            nup: nup ?? null,
            isPolice: features?.isPolice ?? false,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Error en forCreatingSale: ${error.message}`, error.stack);
      return {
        error: true,
        message: 'Error al obtener los datos de la persona para crear la venta',
        data: null,
      };
    }
  }

}
