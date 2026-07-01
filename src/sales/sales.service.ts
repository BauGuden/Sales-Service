import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NatsService } from 'src/common';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  Group,
  Parameter,
  PaymentType,
  PaymentTypeState,
  Product,
  QrPayment,
  QrPaymentStatus,
  Sale,
  SaleProducts,
  SaleState,
  Voucher,
} from './entities';
import {
  AccountDataDto,
  AccountLookupDataDto,
  BcbQrDataDto,
  CreateSaleDto,
  GenerateQrDto,
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
            'accounts.findAllByIds',
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
        await this.nats.firstValue('financialEntities.findAllForSales', {});

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
        await this.nats.firstValue('accounts.findAll', {});

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

  private async personDetailsById(personId: number): Promise<{
    error: boolean;
    message: string;
    data: PersonForCreatingSaleDataDto | null;
  }> {
    try {
      if (!Number.isInteger(personId) || personId <= 0) {
        return {
          error: true,
          message: 'Seleccione una persona para crear la venta.',
          data: null,
        };
      }

      const personResponse = await this.nats.firstValue('person.findOne', {
        term: String(personId),
        field: 'id',
      });
      const person = personResponse?.data ?? personResponse;

      if (!person) {
        return {
          error: true,
          message: 'No se encontró la persona seleccionada.',
          data: null,
        };
      }

      const affiliate = person.personAffiliates?.find(
        (item: { type?: string; typeId?: number }) =>
          item.type === 'affiliates',
      );

      return {
        error: false,
        message: 'Datos de la persona obtenidos correctamente',
        data: {
          id: person.id,
          uuidColumn: person.uuidColumn,
          fullName: [
            person.firstName,
            person.secondName,
            person.lastName,
            person.mothersLastName,
          ]
            .filter(Boolean)
            .join(' '),
          identityCard: person.identityCard ?? '',
          nup: affiliate?.typeId ?? null,
          isPolice: Boolean(affiliate),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error en personDetailsById: ${error.message}`,
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

  async generateQr(data: GenerateQrDto): Promise<{
    error: boolean;
    message: string;
    data: {
      personId: number;
      paymentTypeId: number;
      destinationAccount: string;
      accountNumber: string;
      ctaDestino: string;
      fechaVencimientoQR: string;
      bcbQrId: string;
      total: number;
      qrImage: string;
      qrStatus: QrPaymentStatus;
      expirationDateQr: Date;
    } | null;
  }> {
    try {
      const validation = await this.validateSaleInput(data);

      if (validation.error) {
        return validation;
      }

      if (!this.isQrPaymentType(validation.paymentType)) {
        return {
          error: true,
          message: 'El tipo de pago seleccionado no corresponde a QR.',
          data: null,
        };
      }

      const qrData = await this.buildQrDataFromGlobalAccount(
        validation.products,
        validation.saleTotal,
        validation.normalizedProducts,
      );
      const qrDataErrors = this.validateBcbQrData(qrData);

      if (qrDataErrors.length > 0) {
        return {
          error: true,
          message: `Datos QR incompletos: ${qrDataErrors.join(', ')}`,
          data: null,
        };
      }

      const generatedQr = await this.generateBcbQr(
        this.buildBcbQrPayload(
          qrData,
          { id: null, personId: validation.personId },
          validation.saleTotal,
          validation.normalizedProducts,
          validation.person,
        ),
      );
      const qrId = String(generatedQr.datos.idQr);
      const qrImage = String(generatedQr.datos.imagenQr);
      const expirationDateQr =
        this.parseOptionalDate(qrData.fechaVencimientoQR) ??
        this.buildDefaultQrExpiration();

      await this.qrPaymentsRepository.save(
        this.qrPaymentsRepository.create({
          personId: validation.personId,
          qrId,
          qrImage,
          dataResponse: {
            personId: validation.personId,
            paymentTypeId: validation.paymentTypeId,
            parameterId: validation.parameterId,
            saleProducts: this.mapInputSaleProducts(data.saleProducts),
          },
          qrStatus: QrPaymentStatus.PENDIENTE,
          expirationDateQr,
        }),
      );

      return {
        error: false,
        message: 'QR generado correctamente',
        data: {
          personId: validation.personId,
          paymentTypeId: validation.paymentTypeId,
          destinationAccount: qrData.destinationAccount,
          accountNumber: qrData.accountNumber,
          ctaDestino: qrData.ctaDestino,
          fechaVencimientoQR: qrData.fechaVencimientoQR,
          bcbQrId: qrId,
          total: validation.saleTotal,
          qrImage,
          qrStatus: QrPaymentStatus.PENDIENTE,
          expirationDateQr,
        },
      };
    } catch (error) {
      this.logger.error(`Error en generateQr: ${error.message}`, error.stack);
      return {
        error: true,
        message: error.message ?? 'Error al generar el QR',
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
        saleProducts: {
          productId: number;
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
      const validation = await this.validateSaleInput(data);

      if (validation.error) {
        return validation;
      }

      if (this.isQrPaymentType(validation.paymentType)) {
        return {
          error: true,
          message:
            'Las ventas con QR se crean automáticamente cuando BCB notifica el pago.',
          data: null,
        };
      }

      if (!this.isManualPaymentType(validation.paymentType)) {
        return {
          error: true,
          message:
            'El tipo de pago seleccionado no está habilitado para crear ventas manuales.',
          data: null,
        };
      }

      const createdSale = await this.createSaleRecords({
        data,
        validation,
        voucher: {
          customer: data.voucher.customer.trim() || null,
          identityCardCustomer:
            data.voucher.identityCardCustomer.trim() || null,
          paymentLocationId: data.voucher.paymentLocationId,
          depositDate:
            this.parseOptionalDate(data.voucher.depositDate) ?? new Date(),
        },
      });

      return this.buildCreateSaleResponse(data, validation, createdSale);
    } catch (error) {
      this.logger.error(`Error en createSale: ${error.message}`, error.stack);
      return {
        error: true,
        message: error.message ?? 'Error al crear la venta',
        data: null,
      };
    }
  }

  private async createSaleRecords(params: {
    data: CreateSaleDto | GenerateQrDto;
    validation: any;
    voucher: {
      customer: string | null;
      identityCardCustomer: string | null;
      paymentLocationId: number | null;
      depositDate: Date | null;
    };
    transactionId?: string | null;
    qrPayment?: QrPayment | null;
    qrPaymentDataResponse?: Record<string, unknown>;
  }): Promise<{
    sale: Sale;
    saleProducts: SaleProducts[];
    voucher: Voucher;
    qrPayment: QrPayment | null;
  }> {
    const {
      data,
      validation,
      voucher,
      transactionId = null,
      qrPayment = null,
      qrPaymentDataResponse,
    } = params;

    return this.dataSource.transaction(async (manager) => {
      const saleState = SaleState.VIGENTE;
      const code =
        saleState === SaleState.VIGENTE &&
        this.isManualPaymentType(validation.paymentType)
          ? await this.generateNextSaleCode(manager)
          : null;

      const sale = await manager.save(
        manager.create(Sale, {
          code,
          saleState,
          personId: validation.personId,
          transactionId,
          parameter: validation.parameter,
        }),
      );

      const saleProducts = validation.normalizedProducts.map((item) => {
        const product = validation.productsById.get(item.productId);

        return manager.create(SaleProducts, {
          sale,
          product,
          name: product.name,
          price: item.price,
          amount: item.amount,
          total: item.total,
        });
      });
      const savedSaleProducts = await manager.save(SaleProducts, saleProducts);

      const savedVoucher = await manager.save(
        manager.create(Voucher, {
          sale,
          customer: voucher.customer,
          identityCardCustomer: voucher.identityCardCustomer,
          paymentLocationId: voucher.paymentLocationId,
          paymentType: validation.paymentType,
          paymentTypeState: PaymentTypeState.PAGADO,
          depositDate: voucher.depositDate,
          total: validation.saleTotal,
        }),
      );

      let savedQrPayment: QrPayment | null = null;

      if (qrPayment) {
        qrPayment.qrStatus = QrPaymentStatus.PAGADO;
        qrPayment.dataResponse = {
          ...(qrPaymentDataResponse ?? qrPayment.dataResponse),
          createdSaleId: sale.id,
        };
        savedQrPayment = await manager.save(QrPayment, qrPayment);
      }

      return {
        sale,
        saleProducts: savedSaleProducts,
        voucher: savedVoucher,
        qrPayment: savedQrPayment,
      };
    });
  }

  private async generateNextSaleCode(manager: EntityManager): Promise<string> {
    const saleTablePath = manager.getRepository(Sale).metadata.tablePath;

    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `${saleTablePath}:code`,
    ]);

    const result = await manager
      .createQueryBuilder(Sale, 'sale')
      .select('COALESCE(MAX(CAST(sale.code AS BIGINT)), 0)', 'maxCode')
      .where("sale.code ~ '^[0-9]+$'")
      .getRawOne<{ maxCode: string }>();

    const nextCode = Number(result?.maxCode ?? 0) + 1;

    if (!Number.isSafeInteger(nextCode) || nextCode > 99_999_999) {
      throw new Error('Se alcanzó el límite de códigos de venta de 8 dígitos.');
    }

    return String(nextCode).padStart(8, '0');
  }

  private buildCreateSaleResponse(
    data: CreateSaleDto | GenerateQrDto,
    validation: any,
    createdSale: {
      sale: Sale;
      saleProducts: SaleProducts[];
      voucher: Voucher;
      qrPayment: QrPayment | null;
    },
  ) {
    return {
      error: false,
      message: 'Venta creada correctamente',
      data: {
        datosIngreso: {
          personId: validation.personId,
          paymentTypeId: validation.paymentTypeId,
          parameterId: validation.parameterId,
          saleProducts: this.mapInputSaleProducts(data.saleProducts),
        },
        sales: {
          id: createdSale.sale.id,
          code: createdSale.sale.code,
          saleState: createdSale.sale.saleState,
          personId: createdSale.sale.personId,
          transactionId: createdSale.sale.transactionId,
          parameterId: validation.parameterId,
        },
        voucher: {
          id: createdSale.voucher.id,
          saleId: createdSale.sale.id,
          customer: createdSale.voucher.customer,
          identityCardCustomer: createdSale.voucher.identityCardCustomer,
          paymentLocationId: createdSale.voucher.paymentLocationId,
          paymentTypeId: validation.paymentTypeId,
          paymentTypeState: createdSale.voucher.paymentTypeState,
          depositDate: createdSale.voucher.depositDate,
          total: Number(createdSale.voucher.total),
        },
        qrPayment: createdSale.qrPayment
          ? {
              id: createdSale.qrPayment.id,
              voucherId: createdSale.voucher.id,
              bcbQrId: createdSale.qrPayment.qrId,
              qrImage: createdSale.qrPayment.qrImage,
              qrResponse: createdSale.qrPayment.dataResponse,
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
  }

  async getQRCodeStatus(data: GetQrCodeStatusDto): Promise<{
    error: boolean;
    message: string;
    data: {
      qrId: string;
      paymentTypeState: PaymentTypeState | null;
      depositDate: Date | null;
      qrStatus: QrPaymentStatus;
      statusValidation: Record<string, unknown> | null;
      bcbResponse: Record<string, unknown>;
    } | null;
  }> {
    try {
      const qrId = data.qrId?.trim();

      if (!qrId) {
        return {
          error: true,
          message: 'Debe enviar qrId para consultar el estado del QR',
          data: null,
        };
      }

      let qrPayment = await this.qrPaymentsRepository.findOne({
        where: { qrId },
      });
      const response = await this.getBcbQrStatus(qrId);

      const depositDate =
        this.extractDepositDateFromQrStatus(response) ??
        (response?.statusValidation?.isPaid ? new Date() : null);
      const qrStatus = this.resolveQrPaymentStatus(response, qrPayment);

      if (qrPayment) {
        qrPayment.qrStatus = qrStatus;

        await this.qrPaymentsRepository.save(qrPayment);
      }

      return {
        error: false,
        message: 'Estado del QR consultado correctamente',
        data: {
          qrId,
          paymentTypeState: response?.statusValidation?.isPaid
            ? PaymentTypeState.PAGADO
            : response?.statusValidation?.isRejected
              ? PaymentTypeState.RECHAZADO
              : null,
          depositDate,
          qrStatus,
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

  async processBcbPaymentNotification(data: {
    notification?: any;
    bcbValidation?: any;
  }): Promise<{
    error: boolean;
    message: string;
    data: Record<string, unknown> | null;
  }> {
    try {
      const notification = data?.notification ?? data;
      const qrId = this.extractQrIdFromBcbNotification(notification);

      if (!qrId) {
        return {
          error: true,
          message: 'La notificación BCB no contiene idQR.',
          data: null,
        };
      }

      const qrPayment = await this.qrPaymentsRepository.findOne({
        where: { qrId },
      });

      if (!qrPayment) {
        return {
          error: true,
          message: 'No se encontró un QR generado con el id notificado.',
          data: { qrId, notification },
        };
      }

      const notifiedStatus = String(notification?.estado ?? '').trim();
      const qrStatus =
        this.resolveQrPaymentStatusFromBcbNotification(notifiedStatus);

      if (qrStatus !== QrPaymentStatus.PAGADO) {
        qrPayment.qrStatus = qrStatus;
        qrPayment.dataResponse = this.mergeQrPaymentDataResponse(qrPayment, {
          lastBcbNotification: notification,
        });

        await this.qrPaymentsRepository.save(qrPayment);

        return {
          error: false,
          message:
            qrStatus === QrPaymentStatus.RECHAZADO
              ? 'QR rechazado por BCB. No se creó la venta.'
              : 'QR pendiente según BCB. No se creó la venta.',
          data: {
            qrId,
            qrStatus,
            notification,
          },
        };
      }

      if (qrPayment.qrStatus === QrPaymentStatus.PAGADO) {
        return {
          error: false,
          message: 'La notificación BCB ya fue procesada anteriormente.',
          data: {
            qrId,
            qrStatus: qrPayment.qrStatus,
            notification,
          },
        };
      }

      const transactionId = this.extractBcbTransactionId(notification);
      const existingSale = transactionId
        ? await this.salesRepository.findOne({
            where: { transactionId },
          })
        : null;

      if (existingSale) {
        qrPayment.qrStatus = QrPaymentStatus.PAGADO;
        qrPayment.dataResponse = this.mergeQrPaymentDataResponse(qrPayment, {
          lastBcbNotification: notification,
        });
        await this.qrPaymentsRepository.save(qrPayment);

        return {
          error: false,
          message: 'La venta ya fue creada para esta transacción BCB.',
          data: {
            qrId,
            saleId: existingSale.id,
            transactionId,
            notification,
          },
        };
      }

      const salePayload = this.buildSalePayloadFromQrPayment(qrPayment);

      if (!salePayload) {
        return {
          error: true,
          message:
            'El QR no tiene los datos originales necesarios para crear la venta.',
          data: { qrId, notification },
        };
      }

      const validation = await this.validateSaleInput(salePayload);

      if (validation.error) {
        return {
          error: true,
          message: validation.message,
          data: {
            qrId,
            notification,
            validation,
          },
        };
      }

      if (!this.isQrPaymentType(validation.paymentType)) {
        return {
          error: true,
          message: 'El QR generado no corresponde a un tipo de pago QR.',
          data: { qrId, notification },
        };
      }

      const createdSale = await this.createSaleRecords({
        data: salePayload,
        validation,
        transactionId,
        voucher: {
          customer: notification?.nombreOriginante?.trim() || null,
          identityCardCustomer: notification?.ciNitOriginante?.trim() || null,
          paymentLocationId: null,
          depositDate:
            this.extractDepositDateFromBcbNotification(notification) ??
            new Date(),
        },
        qrPayment,
        qrPaymentDataResponse: this.mergeQrPaymentDataResponse(qrPayment, {
          lastBcbNotification: notification,
        }),
      });

      return {
        error: false,
        message: 'Notificación BCB procesada. Venta creada correctamente.',
        data: {
          qrId,
          saleId: createdSale.sale.id,
          voucherId: createdSale.voucher.id,
          transactionId: createdSale.sale.transactionId,
          notification,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error en processBcbPaymentNotification: ${error.message}`,
        error.stack,
      );

      return {
        error: true,
        message:
          error.message ?? 'Error al procesar la notificación de pago BCB',
        data: null,
      };
    }
  }

  private extractQrIdFromBcbNotification(notification: any): string {
    return String(
      notification?.idQR ??
        notification?.idQr ??
        notification?.idqr ??
        notification?.qrId ??
        '',
    ).trim();
  }

  private extractBcbTransactionId(notification: any): string | null {
    const transactionId = String(
      notification?.idOrdenDestinatario ??
        notification?.idOrden ??
        notification?.transactionId ??
        '',
    ).trim();

    return transactionId || null;
  }

  private extractDepositDateFromBcbNotification(
    notification: any,
  ): Date | null {
    const dateValue =
      notification?.fecha ??
      notification?.fechaPago ??
      notification?.fechaProcesamiento ??
      notification?.fechaHora ??
      notification?.createdAt;

    return this.parseOptionalDate(dateValue);
  }

  private resolveQrPaymentStatusFromBcbNotification(
    status: string,
  ): QrPaymentStatus {
    switch (status) {
      case 'PROCESADO':
        return QrPaymentStatus.PAGADO;
      case 'RECHAZADO':
        return QrPaymentStatus.RECHAZADO;
      default:
        return QrPaymentStatus.PENDIENTE;
    }
  }

  private mergeQrPaymentDataResponse(
    qrPayment: QrPayment,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const currentData =
      qrPayment.dataResponse && typeof qrPayment.dataResponse === 'object'
        ? qrPayment.dataResponse
        : {};

    return {
      ...currentData,
      ...data,
    };
  }

  private buildSalePayloadFromQrPayment(
    qrPayment: QrPayment,
  ): GenerateQrDto | null {
    const storedData =
      qrPayment.dataResponse && typeof qrPayment.dataResponse === 'object'
        ? (qrPayment.dataResponse as any)
        : null;

    const personId = Number(storedData?.personId);
    const paymentTypeId = Number(storedData?.paymentTypeId);
    const parameterId = Number(storedData?.parameterId);
    const saleProducts = Array.isArray(storedData?.saleProducts)
      ? storedData.saleProducts
      : [];

    if (
      !Number.isInteger(personId) ||
      personId <= 0 ||
      !Number.isInteger(paymentTypeId) ||
      paymentTypeId <= 0 ||
      !Number.isInteger(parameterId) ||
      parameterId <= 0 ||
      saleProducts.length === 0
    ) {
      return null;
    }

    return {
      personId,
      paymentTypeId,
      parameterId,
      saleProducts,
    };
  }

  private isQrPaymentType(
    paymentType: PaymentType | null | undefined,
  ): boolean {
    return paymentType?.shortened?.toUpperCase() === 'QR';
  }

  private isManualPaymentType(
    paymentType: PaymentType | null | undefined,
  ): boolean {
    return ['EF', 'DEP', 'TRANSF'].includes(
      paymentType?.shortened?.toUpperCase() ?? '',
    );
  }

  private mapInputSaleProducts(
    saleProducts: CreateSaleDto['saleProducts'] | GenerateQrDto['saleProducts'],
  ): {
    productId: number;
    name: string;
    code: string;
    price: string;
    amount: number;
  }[] {
    return saleProducts.map((saleProduct) => ({
      productId: Number(saleProduct.productId),
      name: saleProduct.name,
      code: saleProduct.code,
      price: saleProduct.price,
      amount: saleProduct.amount,
    }));
  }

  private async validateSaleInput(
    data: CreateSaleDto | GenerateQrDto,
  ): Promise<any> {
    const personId = Number(data.personId);
    const paymentTypeId = Number(data.paymentTypeId);
    const parameterId = Number(data.parameterId);

    const normalizedProducts: NormalizedSaleProductDto[] =
      data.saleProducts.map((item) => {
        const productId = Number(item?.productId);
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

    const invalidProduct = normalizedProducts.find(
      (item) => !Number.isInteger(item.productId) || item.productId <= 0,
    );

    if (invalidProduct) {
      return {
        error: true,
        message: 'Cada producto debe enviar productId válido.',
        data: null,
      };
    }

    if (new Set(productIds).size !== productIds.length) {
      return {
        error: true,
        message: 'Hay un producto repetido en la venta. Revise la selección.',
        data: null,
      };
    }

    const [parameter, paymentType, products, personResult] = await Promise.all([
      this.parameterRepository.findOne({
        where: { id: parameterId, isActive: true },
      }),
      this.paymentTypesRepository.findOne({
        where: { id: paymentTypeId },
      }),
      this.productsRepository.find({
        where: { id: In(productIds), isActive: true },
        relations: ['group'],
      }),
      this.personDetailsById(personId),
    ]);

    if (!parameter) {
      return {
        error: true,
        message: 'No se encontró la configuración activa para crear la venta.',
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
      const existingProductIds = new Set(products.map((product) => product.id));
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

    for (const item of normalizedProducts) {
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

    return {
      error: false,
      personId,
      paymentTypeId,
      parameterId,
      normalizedProducts,
      parameter,
      paymentType,
      products,
      productsById,
      person: personResult.data,
      saleTotal: Number(saleTotal.toFixed(2)),
    };
  }

  private async buildQrDataFromGlobalAccount(
    products: Product[],
    saleTotal: number,
    saleProducts: NormalizedSaleProductDto[],
  ): Promise<
    BcbQrDataDto & {
      destinationAccount: string;
      accountNumber: string;
      ctaDestino: string;
      fechaVencimientoQR: string;
    }
  > {
    const accountIds = [
      ...new Set(
        products
          .map((product) => product.group?.accountId)
          .filter((accountId) => Number.isInteger(Number(accountId))),
      ),
    ];

    if (accountIds.length !== 1) {
      throw new Error(
        'No se puede determinar una única cuenta destino para generar el QR.',
      );
    }

    const response = await this.nats.firstValue('accounts.findAllData', {});

    if (response?.error) {
      throw new Error(
        response?.message ?? 'No se pudieron obtener las cuentas destino.',
      );
    }

    const accounts = Array.isArray(response?.data) ? response.data : [];
    const account = accounts.find((item: any) => item?.id === accountIds[0]);

    if (!account) {
      throw new Error('No se encontró la cuenta destino para generar el QR.');
    }

    const eif = String(account.financialEntity?.eif ?? '').trim();
    const accountNumber = this.normalizeBcbAccountNumber(account.accountNumber);

    if (!eif) {
      throw new Error(
        'La entidad financiera de la cuenta destino no tiene EIF configurado.',
      );
    }

    const bcbAccount = await this.resolveBcbDestinationAccount(
      account,
      eif,
      accountNumber,
    );
    const cuentaDestino = bcbAccount.cuentaDestino;
    const titularDestinatario =
      bcbAccount.titularDestinatario || String(account.name ?? '').trim();
    const ciNitDestinatario =
      bcbAccount.ciNitDestinatario || String(account.ciNitTitular ?? '').trim();
    const fechaVencimiento = this.formatBcbDate(
      this.buildDefaultQrExpiration(),
    );

    return {
      destinationAccount: String(account.name ?? '').trim(),
      accountNumber: String(account.accountNumber ?? '').trim(),
      ctaDestino: cuentaDestino,
      fechaVencimientoQR: fechaVencimiento,
      titularDestinatario,
      ciNitDestinatario,
      eif,
      cuentaDestino,
      cuentaDestinoDistribucion: {
        [cuentaDestino]: Number(Number(saleTotal).toFixed(2)),
      },
      codMoneda: 'BOB',
      glosa: this.normalizeBcbText(
        `Venta QR ${saleProducts.map((product) => product.name).join(',')}`,
      ),
      fechaVencimiento,
      unicoUso: true,
      codigoServicio: '0',
      metaData: {
        origen: 'sales-service',
        tipo: 'venta-qr',
      },
    };
  }

  private async resolveBcbDestinationAccount(
    account: any,
    eif: string,
    accountNumber: string,
  ): Promise<{
    cuentaDestino: string;
    titularDestinatario: string;
    ciNitDestinatario: string;
  }> {
    const localCta = this.normalizeBcbAccountNumber(account.cta);

    if (localCta && localCta !== '0') {
      return {
        cuentaDestino: localCta,
        titularDestinatario: String(account.name ?? '').trim(),
        ciNitDestinatario: String(account.ciNitTitular ?? '').trim(),
      };
    }

    const response = await this.nats.firstValue('bcb.entities', {});

    if (!response?.serviceStatus || response?.finalizado === false) {
      throw new Error(
        response?.message ??
          response?.mensaje ??
          'No se pudieron consultar las cuentas BCB de la entidad.',
      );
    }

    const bcbAccounts = Array.isArray(response?.datos?.cuentas)
      ? response.datos.cuentas
      : [];
    const bcbAccount = bcbAccounts.find(
      (item: any) =>
        String(item?.eif ?? '').trim() === eif &&
        this.normalizeBcbAccountNumber(item?.eifCuenta) === accountNumber,
    );
    const cuentaDestino = this.normalizeBcbAccountNumber(bcbAccount?.cta);

    if (!cuentaDestino || cuentaDestino === '0') {
      throw new Error(
        `La cuenta ${account.accountNumber} no tiene cta BCB activa. Registre o sincronice la cuenta antes de generar QR.`,
      );
    }

    return {
      cuentaDestino,
      titularDestinatario: String(
        bcbAccount?.nombreTitular ?? account.name ?? '',
      ).trim(),
      ciNitDestinatario: String(
        bcbAccount?.ciNitTitular ?? account.ciNitTitular ?? '',
      ).trim(),
    };
  }

  private normalizeBcbAccountNumber(value: unknown): string {
    return String(value ?? '')
      .replace(/\D/g, '')
      .trim();
  }

  private normalizeBcbText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async ensureBcbQrPaid(qrId: string): Promise<{
    qrId: string;
    response: Record<string, unknown>;
    processedOrder: any;
    depositDate: Date;
  }> {
    const response = await this.getBcbQrStatus(qrId);

    if (!response?.statusValidation?.isPaid) {
      throw new Error('El QR todavía no fue pagado. No se creó la venta.');
    }

    const processedOrder = this.extractProcessedQrOrder(response);
    const depositDate =
      this.extractDepositDateFromQrStatus(response) ?? new Date();

    return {
      qrId,
      response,
      processedOrder,
      depositDate,
    };
  }

  private async getBcbQrStatus(qrId: string): Promise<any> {
    const response = await this.nats.firstValue('bcb.qrStatus', { qrId });

    if (!response?.serviceStatus) {
      throw new Error(
        'Servicio BCB no disponible para consultar el estado del QR',
      );
    }

    if (response?.finalizado === false) {
      throw new Error(
        response?.mensaje ?? 'BCB no finalizó la consulta del QR',
      );
    }

    return response;
  }

  private resolveQrPaymentStatus(
    response: any,
    qrPayment?: QrPayment | null,
  ): QrPaymentStatus {
    if (response?.statusValidation?.isPaid) {
      return QrPaymentStatus.PAGADO;
    }

    if (response?.statusValidation?.isRejected) {
      return QrPaymentStatus.RECHAZADO;
    }

    if (
      qrPayment?.expirationDateQr &&
      qrPayment.expirationDateQr < new Date()
    ) {
      return QrPaymentStatus.EXPIRADO;
    }

    return QrPaymentStatus.PENDIENTE;
  }

  private parseOptionalDate(value?: string): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private buildDefaultQrExpiration(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 1);

    return date;
  }

  private formatBcbDate(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');

    return [
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    ].join(' ');
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
    sale: { id?: number | null; personId: number },
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
      glosa: this.normalizeBcbText(
        qrData.glosa?.trim() || (sale.id ? `Venta ${sale.id}` : 'Venta QR'),
      ),
      fechaVencimiento: qrData.fechaVencimiento.trim(),
      unicoUso: qrData.unicoUso,
      codigoServicio: qrData.codigoServicio.trim(),
      metaData,
    };
  }

  private buildBcbQrMetaData(
    input: Record<string, unknown> | undefined,
    sale: { id?: number | null; personId: number },
    saleProducts: NormalizedSaleProductDto[],
    person: PersonForCreatingSaleDataDto,
  ): Record<string, string> {
    const metadata: Record<string, unknown> = {
      ...(input ?? {}),
      ...(sale.id ? { saleId: sale.id } : {}),
      personId: sale.personId,
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

  private extractDepositDateFromQrStatus(response: any): Date | null {
    const processedOrder = this.extractProcessedQrOrder(response);

    if (!processedOrder?.fecha) {
      return null;
    }

    const depositDate = new Date(processedOrder.fecha);

    return Number.isNaN(depositDate.getTime()) ? null : depositDate;
  }

  private extractProcessedQrOrder(response: any): any | null {
    const orders = Array.isArray(response?.datos?.ordenes)
      ? response.datos.ordenes
      : [];

    return orders.find((order: any) => order?.estado === 'PROCESADO') ?? null;
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
