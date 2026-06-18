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
  QrPayment,
  Sale,
  SaleProduct,
  SaleState,
  Voucher,
} from './entities';
import {
  AccountDataDto,
  AccountLookupDataDto,
  BcbQrDataDto,
  CreateSaleDto,
  GetQrCodeDto,
  GetQrCodeStatusDto,
  FinancialEntitiesDto,
  GroupDataDto,
  NormalizedSaleProductDto,
  ParameterDataDto,
  PaymentTypeDataDto,
  PersonForCreatingSaleDataDto,
  ProductDataDto,
  SaleListItemDto,
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
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    @InjectRepository(QrPayment)
    private readonly qrPaymentsRepository: Repository<QrPayment>,
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

  async financialEntities(): Promise<{
    error: boolean;
    message: string;
    data: FinancialEntitiesDto[] | null;
  }> {
    try {
      const { serviceStatus, error, message, data } =
        await this.nats.firstValue('global.financialEntities', {});

      if (!serviceStatus) {
        return {
          error: true,
          message: 'Servicio de entidades financieras no disponible',
          data: null,
        };
      }

      return {
        error: error ?? false,
        message: message ?? 'Entidades financieras obtenidas correctamente',
        data: data ?? null,
      };
    } catch (error) {
      this.logger.error(
        `Error en financialEntities: ${error.message}`,
        error.stack,
      );
      return {
        error: true,
        message:
          'Error al comunicarse con el servicio de entidades financieras',
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
      financialEntities: FinancialEntitiesDto[] | null;
    } | null;
  }> {
    try {
      const [paymentTypesResult, financialEntitiesResult] = await Promise.all([
        this.paymentTypes(),
        this.financialEntities(),
      ]);

      const error = paymentTypesResult.error || financialEntitiesResult.error;

      if (error) {
        const messages = [
          paymentTypesResult.error ? paymentTypesResult.message : null,
          financialEntitiesResult.error
            ? financialEntitiesResult.message
            : null,
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
          financialEntities: financialEntitiesResult.data,
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

  async personDetails(personUuid: string): Promise<{
    error: boolean;
    message: string;
    data: PersonForCreatingSaleDataDto | null;
  }> {
    try {
      if (!personUuid) {
        return {
          error: true,
          message: 'Seleccione una persona para crear la venta.',
          data: null,
        };
      }

      const personResponse = await this.nats.firstValue(
        'person.findOneWithFeatures',
        {
          uuid: personUuid,
        },
      );

      if (personResponse?.serviceStatus === false) {
        return {
          error: true,
          message:
            'No se pudo validar la persona seleccionada. Intente nuevamente.',
          data: null,
        };
      }

      if (personResponse?.error) {
        return {
          error: true,
          message:
            personResponse.message ??
            'No se pudo validar la persona seleccionada.',
          data: null,
        };
      }

      const person = personResponse?.data ?? personResponse;

      if (!person) {
        return {
          error: true,
          message: 'No se encontró la persona seleccionada.',
          data: null,
        };
      }

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
        message: 'Datos de la persona obtenidos correctamente',
        data: {
          id,
          uuidColumn: personUuid,
          fullName: [firstName, secondName, lastName, mothersLastName]
            .filter(Boolean)
            .join(' '),
          identityCard: identityCard ?? '',
          nup: nup ?? null,
          isPolice: features?.isPolice ?? false,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error en personDetails: ${error.message}`,
        error.stack,
      );
      return {
        error: true,
        message: 'No se pudo validar la persona seleccionada.',
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
      financialEntities?: FinancialEntitiesDto[] | null;
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
        personResult,
        groupsResult,
        parametersResult,
        paymentTypesResult,
        financialEntitiesResult,
      ] = await Promise.all([
        this.personDetails(personUuid),
        this.groups(),
        this.parameters(),
        this.paymentTypes(),
        this.financialEntities(),
      ]);

      if (
        personResult.error ||
        groupsResult.error ||
        parametersResult.error ||
        paymentTypesResult.error ||
        financialEntitiesResult.error
      ) {
        const messages = [
          personResult.error ? personResult.message : null,
          groupsResult.error ? groupsResult.message : null,
          parametersResult.error ? parametersResult.message : null,
          paymentTypesResult.error ? paymentTypesResult.message : null,
          financialEntitiesResult.error
            ? financialEntitiesResult.message
            : null,
        ]
          .filter(Boolean)
          .join('; ');

        return {
          error: true,
          message: `Error al obtener datos para crear la venta: ${messages}`,
          data: null,
        };
      }

      return {
        error: false,
        message: 'Datos para crear la venta obtenidos correctamente',
        data: {
          person: personResult.data,
          groups: groupsResult.data ?? [],
          parameters: parametersResult.data,
          paymentTypes: paymentTypesResult.data ?? [],
          financialEntities: financialEntitiesResult.data,
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
        personUuid: string;
        paymentTypeId: number;
        parameterId: number;
        saleProducts: {
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
        personUuid: string;
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
        depositDate: Date | null;
        total: number;
      };
      qrPayment: {
        id: number;
        voucherId: number;
        bcbQrId: string;
        qrImage: string;
        qrResponse: Record<string, unknown>;
      } | null;
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
      const personUuid = data.personUuid.trim();
      const paymentTypeId = Number(data.paymentTypeId);
      const parameterId = Number(data.parameterId);

      const normalizedProducts: NormalizedSaleProductDto[] =
        data.saleProducts.map((item) => {
          const productId = Number(item?.id);
          const amount = Number(item?.amount);
          const price = Number(item?.price);

          return {
            productId,
            name: item.name.trim(),
            code: item.code.trim(),
            price,
            amount,
            total: Number((price * amount).toFixed(2)),
          };
        });

      const productIds = normalizedProducts.map((item) => item.productId);

      if (new Set(productIds).size !== productIds.length) {
        return {
          error: true,
          message: 'Hay un producto repetido en la venta. Revise la selección.',
          data: null,
        };
      }

      const [parameter, paymentType, products, personResult] =
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
          this.personDetails(personUuid),
        ]);

      if (!parameter) {
        return {
          error: true,
          message:
            'No se encontró la configuración activa para crear la venta.',
          data: null,
        };
      }

      if (normalizedProducts.length > parameter.maxProducts) {
        return {
          error: true,
          message: `Solo puede seleccionar hasta ${parameter.maxProducts} producto(s) por venta.`,
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
          message: `El producto "${productOverAmountLimit.name}" solo permite una cantidad máxima de ${parameter.maxAmountProduct}.`,
          data: null,
        };
      }

      if (!paymentType) {
        return {
          error: true,
          message: 'Seleccione un tipo de pago válido.',
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
          message:
            missingProductIds.length === 1
              ? 'Uno de los productos seleccionados ya no está disponible.'
              : 'Algunos productos seleccionados ya no están disponibles.',
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
            message: `El producto "${item.name}" fue actualizado. Vuelva a seleccionarlo.`,
            data: null,
          };
        }

        if (!Number.isFinite(currentPrice) || currentPrice !== item.price) {
          return {
            error: true,
            message: `El precio de "${item.name}" cambió. Vuelva a seleccionarlo.`,
            data: null,
          };
        }
      }

      if (personResult.error || !personResult.data) {
        return {
          error: true,
          message: personResult.error
            ? personResult.message
            : 'No se encontró la persona seleccionada.',
          data: null,
        };
      }

      const shouldGenerateQr = this.isQrPaymentType(paymentType);

      if (shouldGenerateQr) {
        const qrDataErrors = this.validateBcbQrData(data.qrData);

        if (qrDataErrors.length > 0) {
          return {
            error: true,
            message: `Datos QR incompletos: ${qrDataErrors.join(', ')}`,
            data: null,
          };
        }
      }

      const saleTotal = normalizedProducts.reduce(
        (total, item) => total + item.total,
        0,
      );

      if (!Number.isFinite(saleTotal) || saleTotal > 99_999_999.99) {
        return {
          error: true,
          message: 'El monto total de la venta supera el límite permitido.',
          data: null,
        };
      }

      const createdSale = await this.dataSource.transaction(async (manager) => {
        const initialSaleState = SaleState.PENDIENTE;

        const sale = await manager.save(
          manager.create(Sale, {
            code: null,
            saleState: initialSaleState,
            personUuid,
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
            paymentTypeState: PaymentTypeState.GENERADO,
            depositDate: null,
            total: saleTotal,
          }),
        );

        let qrPayment: QrPayment | null = null;

        if (shouldGenerateQr) {
          const qrPayload = this.buildBcbQrPayload(
            data.qrData,
            sale,
            saleTotal,
            normalizedProducts,
            personResult.data,
          );
          const generatedQr = await this.generateBcbQr(qrPayload);

          qrPayment = await manager.save(
            manager.create(QrPayment, {
              voucher,
              bcbQrId: String(generatedQr.datos.idQr),
              qrImage: String(generatedQr.datos.imagenQr),
              qrResponse: generatedQr,
              qrStatusResponse: null,
            }),
          );
        }

        return {
          sale,
          saleProducts: savedSaleProducts,
          voucher,
          qrPayment,
        };
      });

      return {
        error: false,
        message: 'Venta creada correctamente',
        data: {
          datosIngreso: {
            personUuid,
            paymentTypeId,
            parameterId,
            saleProducts: data.saleProducts.map((saleProduct) => ({
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
            personUuid: createdSale.sale.personUuid,
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
            depositDate: createdSale.voucher.depositDate,
            total: Number(createdSale.voucher.total),
          },
          qrPayment: createdSale.qrPayment
            ? {
                id: createdSale.qrPayment.id,
                voucherId: createdSale.voucher.id,
                bcbQrId: createdSale.qrPayment.bcbQrId,
                qrImage: createdSale.qrPayment.qrImage,
                qrResponse: createdSale.qrPayment.qrResponse,
              }
            : null,
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
        message: error.message ?? 'Error al crear la venta',
        data: null,
      };
    }
  }

  async getQRCode(data: GetQrCodeDto): Promise<{
    error: boolean;
    message: string;
    data: {
      saleId: number;
      voucherId: number;
      bcbQrId: string | null;
      qrImage: string | null;
      qrResponse: Record<string, unknown> | null;
    } | null;
  }> {
    try {
      const saleId = Number(data.saleId);

      if (!Number.isInteger(saleId) || saleId <= 0) {
        return {
          error: true,
          message: 'El id de la venta debe ser un número entero mayor a cero',
          data: null,
        };
      }

      const sale = await this.salesRepository.findOne({
        where: { id: saleId },
        relations: [
          'vouchers',
          'vouchers.paymentType',
          'vouchers.qrPayment',
          'saleProducts',
          'saleProducts.product',
        ],
      });

      if (!sale) {
        return {
          error: true,
          message: `La venta con id ${saleId} no existe`,
          data: null,
        };
      }

      const voucher = sale.vouchers?.[0] ?? null;

      if (!voucher) {
        return {
          error: true,
          message: `La venta con id ${saleId} no tiene voucher asociado`,
          data: null,
        };
      }

      if (!this.isQrPaymentType(voucher.paymentType)) {
        return {
          error: true,
          message: 'La venta no fue creada con tipo de pago QR',
          data: null,
        };
      }

      if (voucher.qrPayment) {
        return {
          error: false,
          message: 'QR obtenido correctamente',
          data: {
            saleId: sale.id,
            voucherId: voucher.id,
            bcbQrId: voucher.qrPayment.bcbQrId,
            qrImage: voucher.qrPayment.qrImage,
            qrResponse: voucher.qrPayment.qrResponse,
          },
        };
      }

      const qrDataErrors = this.validateBcbQrData(data.qrData);

      if (qrDataErrors.length > 0) {
        return {
          error: true,
          message: `Datos QR incompletos: ${qrDataErrors.join(', ')}`,
          data: null,
        };
      }

      const personResult = await this.personDetails(sale.personUuid);

      if (personResult.error || !personResult.data) {
        return {
          error: true,
          message: personResult.error
            ? personResult.message
            : 'No se encontró la persona seleccionada.',
          data: null,
        };
      }

      const normalizedProducts: NormalizedSaleProductDto[] = (
        sale.saleProducts ?? []
      ).map((saleProduct) => ({
        productId: saleProduct.product?.id ?? saleProduct.id,
        name: saleProduct.name,
        code: saleProduct.product?.code ?? '',
        price: Number(saleProduct.price),
        amount: saleProduct.amount,
        total: Number(saleProduct.total),
      }));

      const generatedQr = await this.generateBcbQr(
        this.buildBcbQrPayload(
          data.qrData,
          sale,
          Number(voucher.total),
          normalizedProducts,
          personResult.data,
        ),
      );

      const qrPayment = await this.qrPaymentsRepository.save(
        this.qrPaymentsRepository.create({
          voucher,
          bcbQrId: String(generatedQr.datos.idQr),
          qrImage: String(generatedQr.datos.imagenQr),
          qrResponse: generatedQr,
          qrStatusResponse: null,
        }),
      );

      return {
        error: false,
        message: 'QR generado correctamente',
        data: {
          saleId: sale.id,
          voucherId: voucher.id,
          bcbQrId: qrPayment.bcbQrId,
          qrImage: qrPayment.qrImage,
          qrResponse: qrPayment.qrResponse,
        },
      };
    } catch (error) {
      this.logger.error(`Error en getQRCode: ${error.message}`, error.stack);
      return {
        error: true,
        message: error.message ?? 'Error al generar el QR',
        data: null,
      };
    }
  }

  async getQRCodeStatus(data: GetQrCodeStatusDto): Promise<{
    error: boolean;
    message: string;
    data: {
      qrId: string;
      voucherId: number | null;
      saleId: number | null;
      paymentTypeState: PaymentTypeState | null;
      saleState: SaleState | null;
      depositDate: Date | null;
      statusValidation: Record<string, unknown> | null;
      bcbResponse: Record<string, unknown>;
    } | null;
  }> {
    try {
      const qrPayment = await this.findQrPaymentForStatus(data);
      const qrId = data.qrId?.trim() || qrPayment?.bcbQrId;

      if (!qrId) {
        return {
          error: true,
          message: 'Debe enviar qrId, voucherId o saleId con un QR generado',
          data: null,
        };
      }

      const response = await this.nats.firstValue('bcb.qrStatus', { qrId });

      if (!response?.serviceStatus) {
        return {
          error: true,
          message: 'Servicio BCB no disponible para consultar el estado del QR',
          data: null,
        };
      }

      if (response?.finalizado === false) {
        return {
          error: true,
          message: response?.mensaje ?? 'BCB no finalizó la consulta del QR',
          data: null,
        };
      }

      let savedQrPayment = qrPayment;
      let savedVoucher = qrPayment?.voucher ?? null;

      if (savedQrPayment) {
        savedQrPayment.qrStatusResponse = response;

        if (response?.statusValidation?.isPaid) {
          savedVoucher.paymentTypeState = PaymentTypeState.PAGADO;
          savedVoucher.depositDate =
            this.extractDepositDateFromQrStatus(response) ?? new Date();
          savedVoucher.sale.saleState = SaleState.VIGENTE;
        } else if (response?.statusValidation?.isRejected) {
          savedVoucher.paymentTypeState = PaymentTypeState.RECHAZADO;
        }

        await this.dataSource.transaction(async (manager) => {
          if (savedVoucher.sale) {
            await manager.save(Sale, savedVoucher.sale);
          }
          savedVoucher = await manager.save(Voucher, savedVoucher);
          savedQrPayment = await manager.save(QrPayment, savedQrPayment);
        });
      }

      return {
        error: false,
        message: 'Estado del QR consultado correctamente',
        data: {
          qrId,
          voucherId: savedVoucher?.id ?? null,
          saleId: savedVoucher?.sale?.id ?? null,
          paymentTypeState: savedVoucher?.paymentTypeState ?? null,
          saleState: savedVoucher?.sale?.saleState ?? null,
          depositDate: savedVoucher?.depositDate ?? null,
          statusValidation: response?.statusValidation ?? null,
          bcbResponse: response,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error en getQRCodeStatus: ${error.message}`,
        error.stack,
      );
      return {
        error: true,
        message: error.message ?? 'Error al consultar el estado del QR',
        data: null,
      };
    }
  }

  async listSales(): Promise<{
    error: boolean;
    message: string;
    data: SaleListItemDto[] | null;
  }> {
    try {
      const sales = await this.salesRepository
        .createQueryBuilder('sale')
        .leftJoinAndSelect('sale.saleProducts', 'saleProduct')
        .leftJoinAndSelect('saleProduct.product', 'product')
        .leftJoinAndSelect('sale.vouchers', 'voucher')
        .leftJoinAndSelect('voucher.paymentType', 'paymentType')
        .leftJoinAndSelect('voucher.qrPayment', 'qrPayment')
        .select([
          'sale.id',
          'sale.code',
          'sale.saleState',
          'sale.personUuid',
          'sale.date',
          'saleProduct.id',
          'saleProduct.name',
          'saleProduct.price',
          'saleProduct.amount',
          'saleProduct.total',
          'product.id',
          'voucher.id',
          'voucher.customer',
          'voucher.identityCardCustomer',
          'voucher.depositDate',
          'voucher.total',
          'qrPayment.id',
          'qrPayment.bcbQrId',
          'paymentType.id',
          'paymentType.name',
          'paymentType.shortened',
        ])
        .orderBy('sale.date', 'DESC')
        .addOrderBy('sale.id', 'DESC')
        .addOrderBy('saleProduct.id', 'ASC')
        .getMany();

      const personUuids = [
        ...new Set(sales.map((sale) => sale.personUuid).filter(Boolean)),
      ];
      const personResults = await Promise.all(
        personUuids.map((personUuid) => this.personDetails(personUuid)),
      );
      const personsByUuid = new Map<string, PersonForCreatingSaleDataDto>();

      for (const [index, personResult] of personResults.entries()) {
        if (personResult.error || !personResult.data) {
          return {
            error: true,
            message: personResult.error
              ? personResult.message
              : 'No se encontró una de las personas de las ventas.',
            data: null,
          };
        }

        personsByUuid.set(personUuids[index], personResult.data);
      }

      const data: SaleListItemDto[] = sales.map((sale) => {
        const person = personsByUuid.get(sale.personUuid);
        const voucher = sale.vouchers?.[0] ?? null;

        if (!person) {
          throw new Error('No se encontró una de las personas de las ventas.');
        }

        const saleDate = this.formatBoliviaDateParts(sale.date);

        return {
          saleId: sale.id,
          code: sale.code,
          saleState: sale.saleState,
          personUuid: sale.personUuid,
          fullName: person.fullName,
          identityCard: person.identityCard,
          nup: person.nup,
          isPolice: person.isPolice,
          hourSale: saleDate.hourSale,
          dateSaleFormat: saleDate.dateSaleFormat,
          products: (sale.saleProducts ?? []).map((saleProduct) => ({
            productId: saleProduct.product.id,
            name: saleProduct.name,
            price: Number(saleProduct.price),
            amount: saleProduct.amount,
            subTotal: Number(saleProduct.total),
          })),
          name: voucher?.paymentType?.name ?? null,
          shortened: voucher?.paymentType?.shortened ?? null,
          bcbQrId: voucher?.qrPayment?.bcbQrId ?? null,
          depositDate: voucher?.depositDate ?? null,
          total: voucher ? Number(voucher.total) : null,
        };
      });

      return {
        error: false,
        message: 'Ventas obtenidas correctamente',
        data,
      };
    } catch (error) {
      this.logger.error(`Error en listSales: ${error.message}`, error.stack);
      return {
        error: true,
        message: 'Error al obtener las ventas',
        data: null,
      };
    }
  }

  private isQrPaymentType(
    paymentType: PaymentType | null | undefined,
  ): boolean {
    return paymentType?.shortened?.toUpperCase() === 'QR';
  }

  private validateBcbQrData(qrData?: BcbQrDataDto): string[] {
    if (!qrData) {
      return ['qrData'];
    }

    const errors: string[] = [];
    const requiredStringFields: Array<keyof BcbQrDataDto> = [
      'titularDestinatario',
      'ciNitDestinatario',
      'eif',
      'cuentaDestino',
      'codMoneda',
      'fechaVencimiento',
      'codigoServicio',
    ];

    requiredStringFields.forEach((field) => {
      const value = qrData[field];

      if (typeof value !== 'string' || value.trim().length === 0) {
        errors.push(field);
      }
    });

    if (typeof qrData.unicoUso !== 'boolean') {
      errors.push('unicoUso');
    }

    return errors;
  }

  private buildBcbQrPayload(
    qrData: BcbQrDataDto,
    sale: Sale,
    saleTotal: number,
    saleProducts: NormalizedSaleProductDto[],
    person: PersonForCreatingSaleDataDto,
  ): Record<string, unknown> {
    const importe = Number(Number(saleTotal).toFixed(2));
    const metaData = this.buildBcbQrMetaData(
      qrData.metaData,
      sale,
      saleProducts,
      person,
    );

    return {
      titularDestinatario: qrData.titularDestinatario.trim(),
      ciNitDestinatario: qrData.ciNitDestinatario.trim(),
      eif: qrData.eif.trim(),
      cuentaDestino: qrData.cuentaDestino.trim(),
      ...(qrData.cuentaDestinoDistribucion
        ? { cuentaDestinoDistribucion: qrData.cuentaDestinoDistribucion }
        : {}),
      codMoneda: qrData.codMoneda.trim(),
      importe,
      glosa: qrData.glosa?.trim() || `Venta ${sale.id}`,
      fechaVencimiento: qrData.fechaVencimiento.trim(),
      unicoUso: qrData.unicoUso,
      codigoServicio: qrData.codigoServicio.trim(),
      metaData,
    };
  }

  private buildBcbQrMetaData(
    input: Record<string, unknown> | undefined,
    sale: Sale,
    saleProducts: NormalizedSaleProductDto[],
    person: PersonForCreatingSaleDataDto,
  ): Record<string, string> {
    const metadata: Record<string, unknown> = {
      ...(input ?? {}),
      saleId: sale.id,
      personUuid: sale.personUuid,
      fullName: person.fullName,
      identityCard: person.identityCard,
      productCount: saleProducts.length,
      productCodes: saleProducts
        .map((product) => product.code)
        .filter(Boolean)
        .join(','),
    };

    return Object.fromEntries(
      Object.entries(metadata)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key, value]) => [
          key,
          typeof value === 'object' ? JSON.stringify(value) : String(value),
        ]),
    );
  }

  private async generateBcbQr(payload: Record<string, unknown>): Promise<{
    serviceStatus: boolean;
    finalizado?: boolean;
    mensaje?: string;
    datos: {
      idQr: string;
      imagenQr: string;
    };
    [key: string]: unknown;
  }> {
    const response = await this.nats.firstValue('bcb.generateQr', payload);

    if (!response?.serviceStatus) {
      throw new Error(
        response?.message ?? 'Servicio BCB no disponible para generar QR',
      );
    }

    if (response?.finalizado === false) {
      throw new Error(response?.mensaje ?? 'BCB no finalizó la generación QR');
    }

    if (!response?.datos?.idQr || !response?.datos?.imagenQr) {
      throw new Error('BCB no devolvió idQr o imagenQr');
    }

    return response;
  }

  private async findQrPaymentForStatus(
    data: GetQrCodeStatusDto,
  ): Promise<QrPayment | null> {
    const voucherId = Number(data.voucherId);

    if (Number.isInteger(voucherId) && voucherId > 0) {
      return this.qrPaymentsRepository.findOne({
        where: { voucher: { id: voucherId } },
        relations: ['voucher', 'voucher.sale', 'voucher.paymentType'],
      });
    }

    const saleId = Number(data.saleId);

    if (Number.isInteger(saleId) && saleId > 0) {
      return this.qrPaymentsRepository.findOne({
        where: { voucher: { sale: { id: saleId } } },
        relations: ['voucher', 'voucher.sale', 'voucher.paymentType'],
      });
    }

    const qrId = data.qrId?.trim();

    if (qrId) {
      return this.qrPaymentsRepository.findOne({
        where: { bcbQrId: qrId },
        relations: ['voucher', 'voucher.sale', 'voucher.paymentType'],
      });
    }

    return null;
  }

  private extractDepositDateFromQrStatus(response: any): Date | null {
    const orders = Array.isArray(response?.datos?.ordenes)
      ? response.datos.ordenes
      : [];
    const processedOrder = orders.find(
      (order: any) => order?.estado === 'PROCESADO' && order?.fecha,
    );

    if (!processedOrder?.fecha) {
      return null;
    }

    const depositDate = new Date(processedOrder.fecha);

    return Number.isNaN(depositDate.getTime()) ? null : depositDate;
  }

  private formatBoliviaDateParts(date: Date): {
    hourSale: string;
    dateSaleFormat: string;
  } {
    const boliviaOffsetMs = 4 * 60 * 60 * 1000;
    const boliviaDate = new Date(date.getTime() - boliviaOffsetMs);
    const [datePart, timePart] = boliviaDate.toISOString().split('T');
    const [year, month, day] = datePart.split('-');

    return {
      hourSale: timePart.slice(0, 8),
      dateSaleFormat: `${day}/${month}/${year}`,
    };
  }
}
