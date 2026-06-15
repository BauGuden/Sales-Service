import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NatsService } from 'src/common';
import { DataSource, In, Repository } from 'typeorm';
import {
  Group,
  Parameter,
  PaymentType,
  PaymentTypeState,
  Product,
  Sale,
  SaleProduct,
  SaleState,
  Voucher,
} from './entities';
import {
  AccountDataDto,
  AccountLookupDataDto,
  CreateSaleDto,
  GroupDataDto,
  ParameterDataDto,
  PaymentLocationDataDto,
  PaymentTypeDataDto,
  PersonForCreatingSaleDataDto,
  ProductDataDto,
  SearchPersonDataDto,
} from './dto';

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
    @InjectRepository(Parameter)
    private readonly parameterRepository: Repository<Parameter>,
    private readonly dataSource: DataSource,
  ) {}

  async searchPerson(
    value: string,
    type: string,
  ): Promise<{
    error: boolean;
    message: string;
    data: SearchPersonDataDto | null;
  }> {
    try {
      const { serviceStatus, error, message, data } =
        await this.nats.firstValue('person.search', { value, type });

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
    data: GroupDataDto[] | null;
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

      const accountIds = [
        ...new Set(
          groups
            .map((g) => g.accountId)
            .filter((id) => id !== null && id !== undefined),
        ),
      ];

      const accountMap = new Map<
        number,
        { name: string | null; shortened: string | null }
      >();

      if (accountIds.length > 0) {
        try {
          const response = await this.nats.firstValue(
            'global.findAllAccountsByIds',
            {
              ids: accountIds,
              columns: ['id', 'name', 'shortened'],
            },
          );

          const accounts = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
              ? response.data
              : [];

          if (accounts.length > 0 && response?.serviceStatus !== false) {
            accounts.forEach((acc: AccountLookupDataDto) => {
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

      const enrichedGroups: GroupDataDto[] = groups.map((group) => {
        const account = accountMap.get(group.accountId);

        return {
          id: group.id,
          name: group.name,
          shortened: group.shortened,
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
      this.logger.error(
        `Error al obtener grupos: ${error.message}`,
        error.stack,
      );
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
    data: ProductDataDto[] | null;
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
        data: products.map((product) => ({
          id: product.id,
          name: product.name,
          code: product.code,
          price: String(product.price),
        })),
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener productos por grupo ${groupId}: ${error.message}`,
        error.stack,
      );
      return {
        error: true,
        message:
          'No se pudieron obtener los productos por grupo. Verifique la conexión o la existencia de la tabla.',
        data: null,
      };
    }
  }

  async parameters(): Promise<{
    error: boolean;
    message: string;
    data: ParameterDataDto | null;
  }> {
    try {
      const activeParameters = await this.parameterRepository.find({
        where: { isActive: true },
        select: [
          'id',
          'maxAmountProduct',
          'maxProducts',
          'currencySymbol',
          'isActive',
        ],
        order: { id: 'ASC' },
        take: 2,
      });

      if (activeParameters.length === 0) {
        return {
          error: true,
          message: 'No existe un parámetro activo para crear la venta',
          data: null,
        };
      }

      if (activeParameters.length > 1) {
        return {
          error: true,
          message: 'Hay más de un parámetro activo. Solo debe existir uno.',
          data: null,
        };
      }

      return {
        error: false,
        message: 'Parámetro obtenido correctamente',
        data: {
          id: activeParameters[0].id,
          maxAmountProduct: activeParameters[0].maxAmountProduct,
          maxProducts: activeParameters[0].maxProducts,
          currencySymbol: activeParameters[0].currencySymbol,
          isActive: activeParameters[0].isActive,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener parámetros: ${error.message}`,
        error.stack,
      );
      return {
        error: true,
        message:
          'No se pudieron obtener los parámetros. Verifique la conexión o la existencia de la tabla.',
        data: null,
      };
    }
  }

  async paymentLocations(): Promise<{
    error: boolean;
    message: string;
    data: PaymentLocationDataDto[] | null;
  }> {
    try {
      const { serviceStatus, error, message, data } =
        await this.nats.firstValue('global.paymentLocations', {});

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
      this.logger.error(
        `Error en paymentLocations: ${error.message}`,
        error.stack,
      );
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
    data: PaymentTypeDataDto[] | null;
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
      this.logger.error(
        `Error al obtener tipos de pago: ${error.message}`,
        error.stack,
      );
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
    data: AccountDataDto[] | null;
  }> {
    try {
      const { serviceStatus, error, message, data } =
        await this.nats.firstValue('global.accounts', {});

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
      paymentTypes: PaymentTypeDataDto[] | null;
      paymentLocations: PaymentLocationDataDto[] | null;
    } | null;
  }> {
    try {
      const [paymentTypesResult, paymentLocationsResult] = await Promise.all([
        this.paymentTypes(),
        this.paymentLocations(),
      ]);

      const error = paymentTypesResult.error || paymentLocationsResult.error;

      if (error) {
        const messages = [
          paymentTypesResult.error ? paymentTypesResult.message : null,
          paymentLocationsResult.error ? paymentLocationsResult.message : null,
        ]
          .filter(Boolean)
          .join('; ');

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
      person: PersonForCreatingSaleDataDto;
      groups: GroupDataDto[];
      parameters: ParameterDataDto;
      paymentTypes: PaymentTypeDataDto[];
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

      const [
        personResponse,
        groupsResult,
        parametersResult,
        paymentTypesResult,
      ] = await Promise.all([
        this.nats.firstValue('person.findOneWithFeatures', {
          uuid: personUuid,
        }),
        this.groups(),
        this.parameters(),
        this.paymentTypes(),
      ]);

      if (personResponse?.serviceStatus === false) {
        return {
          error: true,
          message: 'Servicio de Beneficiarios no disponible',
          data: null,
        };
      }

      if (personResponse?.error) {
        return {
          error: true,
          message:
            personResponse.message ??
            'No se pudieron obtener los datos de la persona',
          data: null,
        };
      }

      if (
        groupsResult.error ||
        parametersResult.error ||
        paymentTypesResult.error
      ) {
        const messages = [
          groupsResult.error ? groupsResult.message : null,
          parametersResult.error ? parametersResult.message : null,
          paymentTypesResult.error ? paymentTypesResult.message : null,
        ]
          .filter(Boolean)
          .join('; ');

        return {
          error: true,
          message: `Error al obtener datos para crear la venta: ${messages}`,
          data: null,
        };
      }

      const person = personResponse?.data ?? personResponse;
      const {
        id,
        firstName,
        secondName,
        lastName,
        mothersLastName,
        identityCard,
        nup,
        features,
      } = person;

      return {
        error: false,
        message: 'Datos para crear la venta obtenidos correctamente',
        data: {
          person: {
            id: id,
            uuidColumn: personUuid,
            fullName: [firstName, secondName, lastName, mothersLastName]
              .filter(Boolean)
              .join(' '),
            identityCard: identityCard ?? '',
            nup: nup ?? null,
            isPolice: features?.isPolice ?? false,
          },
          groups: groupsResult.data ?? [],
          parameters: parametersResult.data,
          paymentTypes: paymentTypesResult.data ?? [],
        },
      };
    } catch (error) {
      this.logger.error(
        `Error en forCreatingSale: ${error.message}`,
        error.stack,
      );
      return {
        error: true,
        message: 'Error al obtener los datos de la persona para crear la venta',
        data: null,
      };
    }
  }

  async createSale(data: CreateSaleDto): Promise<{
    error: boolean;
    message: string;
    data: {
      datosIngreso: {
        personId: number;
        paymentTypeId: number;
        parameterId: number;
        salesProducts: {
          id: number;
          name: string;
          code: string;
          price: string;
          amount: number;
        }[];
      };
      sales: {
        id: number;
        code: string | null;
        saleState: SaleState;
        personId: number;
        transactionId: string | null;
        parameterId: number;
      };
      voucher: {
        id: number;
        saleId: number;
        customer: string | null;
        identityCardCustomer: string | null;
        paymentLocationId: number | null;
        paymentTypeId: number;
        paymentTypeState: PaymentTypeState;
        total: number;
      };
      saleProducts: {
        id: number;
        productId: number;
        name: string;
        price: number;
        amount: number;
        total: number;
      }[];
    } | null;
  }> {
    try {
      const personId = Number(data?.personId);
      const paymentTypeId = Number(data?.paymentTypeId);
      const parameterId = Number(data?.parameterId);

      const invalidId = [
        ['personId', personId],
        ['paymentTypeId', paymentTypeId],
        ['parameterId', parameterId],
      ].find(([, value]) => !Number.isInteger(value) || Number(value) <= 0);

      if (invalidId) {
        return {
          error: true,
          message: `${invalidId[0]} debe ser un número entero mayor a cero`,
          data: null,
        };
      }

      if (!Array.isArray(data?.salesProducts) || !data.salesProducts.length) {
        return {
          error: true,
          message: 'Debe enviar al menos un producto para crear la venta',
          data: null,
        };
      }

      const normalizedProducts: {
        productId: number;
        name: string;
        code: string;
        price: number;
        amount: number;
        total: number;
      }[] = [];

      for (const [index, item] of data.salesProducts.entries()) {
        const productId = Number(item?.id);
        const amount = Number(item?.amount);
        const price = Number(item?.price);
        const total = Number((price * amount).toFixed(2));

        if (!Number.isInteger(productId) || productId <= 0) {
          return {
            error: true,
            message: `salesProducts[${index}].id debe ser un número entero mayor a cero`,
            data: null,
          };
        }

        if (!item?.name || typeof item.name !== 'string') {
          return {
            error: true,
            message: `salesProducts[${index}].name es requerido`,
            data: null,
          };
        }

        if (!item?.code || typeof item.code !== 'string') {
          return {
            error: true,
            message: `salesProducts[${index}].code es requerido`,
            data: null,
          };
        }

        if (!Number.isInteger(amount) || amount <= 0) {
          return {
            error: true,
            message: `salesProducts[${index}].amount debe ser un número entero mayor a cero`,
            data: null,
          };
        }

        if (!Number.isFinite(price) || price <= 0) {
          return {
            error: true,
            message: `salesProducts[${index}].price debe ser un monto válido mayor a cero con hasta dos decimales`,
            data: null,
          };
        }

        normalizedProducts.push({
          productId,
          name: item.name.trim(),
          code: item.code.trim(),
          price,
          amount,
          total,
        });
      }

      const productIds = normalizedProducts.map((item) => item.productId);

      if (new Set(productIds).size !== productIds.length) {
        return {
          error: true,
          message: 'No se puede enviar el mismo producto más de una vez',
          data: null,
        };
      }

      const [parameter, paymentType, products, personResponse] =
        await Promise.all([
          this.parameterRepository.findOne({
            where: { id: parameterId, isActive: true },
          }),
          this.paymentTypesRepository.findOne({
            where: { id: paymentTypeId },
          }),
          this.productsRepository.find({
            where: { id: In(productIds), isActive: true },
          }),
          this.nats.firstValue('person.findOne', {
            term: String(personId),
            field: 'id',
          }),
        ]);

      if (!parameter) {
        return {
          error: true,
          message: `El parámetro activo con id ${parameterId} no existe`,
          data: null,
        };
      }

      if (normalizedProducts.length > parameter.maxProducts) {
        return {
          error: true,
          message: `La venta admite un máximo de ${parameter.maxProducts} producto(s)`,
          data: null,
        };
      }

      const productOverAmountLimit = normalizedProducts.find(
        (item) =>
          parameter.maxAmountProduct > 0 &&
          item.amount > parameter.maxAmountProduct,
      );

      if (productOverAmountLimit) {
        return {
          error: true,
          message: `El producto con id ${productOverAmountLimit.productId} admite una cantidad máxima de ${parameter.maxAmountProduct}`,
          data: null,
        };
      }

      if (!paymentType) {
        return {
          error: true,
          message: `El tipo de pago con id ${paymentTypeId} no existe`,
          data: null,
        };
      }

      if (products.length !== productIds.length) {
        const existingProductIds = new Set(
          products.map((product) => product.id),
        );
        const missingProductIds = productIds.filter(
          (productId) => !existingProductIds.has(productId),
        );

        return {
          error: true,
          message: `Los siguientes productos no existen o no están activos: ${missingProductIds.join(', ')}`,
          data: null,
        };
      }

      const productsById = new Map(
        products.map((product) => [product.id, product]),
      );

      for (const [index, item] of normalizedProducts.entries()) {
        const product = productsById.get(item.productId);
        const currentPrice = Number(product.price);

        if (product.code !== item.code) {
          return {
            error: true,
            message: `El código de salesProducts[${index}] no coincide con el producto vigente`,
            data: null,
          };
        }

        if (!Number.isFinite(currentPrice) || currentPrice !== item.price) {
          return {
            error: true,
            message: `El precio de salesProducts[${index}] no coincide con el precio vigente del producto`,
            data: null,
          };
        }
      }

      if (personResponse?.serviceStatus === false) {
        return {
          error: true,
          message: 'No se pudo validar la persona en Beneficiarios',
          data: null,
        };
      }

      const person = personResponse?.data ?? personResponse;

      if (!person || Number(person.id) !== personId) {
        return {
          error: true,
          message: `La persona con id ${personId} no existe`,
          data: null,
        };
      }

      const saleTotal = normalizedProducts.reduce(
        (total, item) => total + item.total,
        0,
      );

      if (!Number.isFinite(saleTotal) || saleTotal > 99_999_999.99) {
        return {
          error: true,
          message: 'El total de la venta excede el monto permitido',
          data: null,
        };
      }

      const createdSale = await this.dataSource.transaction(async (manager) => {
        const sale = await manager.save(
          manager.create(Sale, {
            code: null,
            saleState: SaleState.VIGENTE,
            personId,
            transactionId: null,
            parameter,
          }),
        );

        const saleProducts = normalizedProducts.map((item) => {
          const product = productsById.get(item.productId);

          return manager.create(SaleProduct, {
            sale,
            product,
            name: product.name,
            price: item.price,
            amount: item.amount,
            total: item.total,
          });
        });
        const savedSaleProducts = await manager.save(SaleProduct, saleProducts);

        const voucher = await manager.save(
          manager.create(Voucher, {
            sale,
            customer: null,
            identityCardCustomer: null,
            paymentLocationId: null,
            paymentType,
            paymentTypeState: PaymentTypeState.NO_PAGADO,
            total: saleTotal,
          }),
        );

        return {
          sale,
          saleProducts: savedSaleProducts,
          voucher,
        };
      });

      return {
        error: false,
        message: 'Venta creada correctamente',
        data: {
          datosIngreso: {
            personId,
            paymentTypeId,
            parameterId,
            salesProducts: data.salesProducts.map((saleProduct) => ({
              id: saleProduct.id,
              name: saleProduct.name,
              code: saleProduct.code,
              price: saleProduct.price,
              amount: saleProduct.amount,
            })),
          },
          sales: {
            id: createdSale.sale.id,
            code: createdSale.sale.code,
            saleState: createdSale.sale.saleState,
            personId: createdSale.sale.personId,
            transactionId: createdSale.sale.transactionId,
            parameterId,
          },
          voucher: {
            id: createdSale.voucher.id,
            saleId: createdSale.sale.id,
            customer: createdSale.voucher.customer,
            identityCardCustomer: createdSale.voucher.identityCardCustomer,
            paymentLocationId: createdSale.voucher.paymentLocationId,
            paymentTypeId,
            paymentTypeState: createdSale.voucher.paymentTypeState,
            total: Number(createdSale.voucher.total),
          },
          saleProducts: createdSale.saleProducts.map((saleProduct) => ({
            id: saleProduct.id,
            productId: saleProduct.product.id,
            name: saleProduct.name,
            price: Number(saleProduct.price),
            amount: saleProduct.amount,
            total: Number(saleProduct.total),
          })),
        },
      };
    } catch (error) {
      this.logger.error(`Error en createSale: ${error.message}`, error.stack);
      return {
        error: true,
        message: 'Error al crear la venta',
        data: null,
      };
    }
  }
}
