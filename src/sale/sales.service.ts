import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { Repository, DataSource } from 'typeorm';

import { Sale, SaleState } from './entities/sale.entity'; // <--- SaleState para el emun
import { SaleDetail } from '../sale-detail/entities/sale-detail.entity';
import { Product } from '../product/entities/product.entity';
import { CreateSaleDto } from './dto/create-sale.dto';

import { NatsService } from 'src/common';
import { ParametersService } from '../parameters/parameter.service';

@Injectable()
export class SalesService {
  private readonly logger = new Logger('SalesService');

  constructor(
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleDetail) private readonly detailRepo: Repository<SaleDetail>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    
    private readonly parametersService: ParametersService,
    private readonly nats: NatsService,
    
    // <--- INYECTAR DATASOURCE PARA TRANSACCIONES
    private readonly dataSource: DataSource,
  ) {}

  async create(createSaleDto: CreateSaleDto) {
    
    // 1. OBTENER PARÁMETROS DE CONFIGURACIÓN
    const params = await this.parametersService.getActiveParams();

    // 2. VALIDACIÓN DE DUPLICADOS DE FOLDER (CRÍTICO)
    // Verificamos que ningún folder_number ya esté vendido en otra vigente
    const folderNumbers = createSaleDto.details
      .map(d => d.folder_number)
      .filter(f => f); // Filtrar nulos o vacíos

    if (folderNumbers.length > 0) {
      // Buscamos si alguna venta vigente (GENERATED o PAID) usa estos folders
      const duplicate = await this.saleRepo.createQueryBuilder('s')
        .innerJoinAndSelect('s.details', 'd')
        .where('d.folder_number In (:...folders)', { folders: folderNumbers })
        .andWhere('s.state != :state', { state: SaleState.CANCELLED })
        .getOne();

      if (duplicate) {
        // Buscamos cual folder específico es el duplicado
        const duplicatedFolder = duplicate.details.find(d => folderNumbers.includes(d.folder_number));
        throw new RpcException(`El Folder ${duplicatedFolder.folder_number} ya fue vendido en la venta ${duplicate.code}`);
      }
    }

    // 3. OBTENER DATOS DEL AFILIADO (NATS)
    let affiliateName: string;
    try {
      const personResponse: any = await this.nats.firstValueInclude(
        { term: createSaleDto.affiliate_ci, field: 'identityCard' }, 
        'person.findOne',
        ['firstName', 'secondName', 'lastName', 'mothersLastName']
      );

      if (!personResponse || !personResponse.serviceStatus) {
        throw new NotFoundException(`Persona con CI ${createSaleDto.affiliate_ci} no encontrada`);
      }

      affiliateName = [
        personResponse.firstName || '',
        personResponse.secondName || '',
        personResponse.lastName || '',
        personResponse.mothersLastName || '',
      ].filter(Boolean).join(' ');

    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error comunicando con Beneficiary Service: ${(error as Error).message}`);
      throw new RpcException(`Error comunicando con Beneficiary Service`);
    }

    // 4. PROCESAR DETALLES Y CALCULAR TOTAL
    let totalAmount = 0;
    const detailsEntities: SaleDetail[] = [];

    if (createSaleDto.details.length > params.max_products) {
      throw new RpcException(`Supera el límite de productos por venta. Máximo: ${params.max_products}`);
    }

    for (const detailDto of createSaleDto.details) {
      const product = await this.productRepo.findOne({ where: { id: detailDto.product_id } });
      
      if (!product) throw new NotFoundException(`Producto ID ${detailDto.product_id} no encontrado`);
      if (!product.isActive) throw new Error(`Producto ID ${detailDto.product_id} no está activo`);

      const subtotal = product.price * detailDto.quantity;
      totalAmount += subtotal;

      detailsEntities.push(
        this.detailRepo.create({
          product_name: product.name,
          product_code: product.code,
          unit_price: product.price,
          folder_number: detailDto.folder_number,
          quantity: detailDto.quantity,
          subtotal,
          total: subtotal,
        })
      );
    }

    if (totalAmount > params.max_amount) {
       throw new RpcException(`Supera el monto máximo permitido por venta. Máximo: ${params.max_amount}`);
    }

    // 5. TRANSACCIÓN DE BASE DE DATOS
    // Usamos una transacción para asegurar que la venta y sus detalles se guardan átomicamente
    let savedSale: Sale;
    
    await this.dataSource.transaction(async (transactionalEntityManager) => {
      const saleToCreate = transactionalEntityManager.create(Sale, {
        code: `VF-${Date.now()}`, 
        customer_name: createSaleDto.customer_name,
        customer_ci: createSaleDto.customer_ci,
        affiliate_name: affiliateName, 
        affiliate_ci: createSaleDto.affiliate_ci, 
        payment_type_id: createSaleDto.payment_type_id,
        payment_location_id: createSaleDto.payment_location_id,
        voucher_number: createSaleDto.voucher_number,
        receipt_date: new Date(),
        total: totalAmount,
        state: SaleState.GENERATED, // Usamos el Enum
        details: detailsEntities,
      });
      
      savedSale = await transactionalEntityManager.save(saleToCreate);
    });

    // 6. ENVIAR A COLLECTIONS (Fuera de la transacción DB para no bloquear)
    try {
      const collectionResponse = await this.nats.firstValue(
        'collection.create', 
        {
          code: `R-${Date.now()}`,
          sale_code: savedSale.code,
          date: savedSale.date,
          amount: totalAmount,
          payment_type_id: createSaleDto.payment_type_id,
          payment_location_id: createSaleDto.payment_location_id,
          customer_name: createSaleDto.customer_name,
          affiliate_name: affiliateName,
          description: `Venta Folder ${detailsEntities[0].product_code}`,
          source: 'sales'
        }
      );

      // Si Collections responde bien, actualizamos la venta (simple update, no requiere transacción completa)
      if (collectionResponse && collectionResponse.serviceStatus) {
        savedSale.transaction_code = collectionResponse.data.code || collectionResponse.data;
        savedSale.state = SaleState.PAID;
        await this.saleRepo.save(savedSale);
        
        this.logger.log(`Venta ${savedSale.code} PAGADA exitosamente. Transacción: ${savedSale.transaction_code}`);
      } else {
        this.logger.warn(`Venta ${savedSale.code} guardada pero Collections rechazó la transacción.`);
        // Opcional: Cambiar estado a SaleState.PAYMENT_ERROR
      }

    } catch (e) {
      this.logger.error(`Error notificando a Collections Service: ${(e as Error).message}`);
      // Importante: NO lanzamos error para no perder la venta guardada.
    }

    return savedSale;
  }

  findAll() {
    return this.saleRepo.find({ relations: ['details'] });
  }

  async findOne(id: number) {
    const sale = await this.saleRepo.findOne({ 
      where: { id },
      relations: ['details'] 
    });
    if (!sale) throw new NotFoundException(`Sale #${id} not found`);
    return sale;
  }
}