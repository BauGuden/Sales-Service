// Define el Enum al principio o en un archivo aparte
export enum SaleState {
  GENERATED = 'GENERATED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  PAYMENT_ERROR = 'PAYMENT_ERROR', // Agregado para errores de Collections
}

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Parameter } from './parameter.entity';
import { PaymentType } from './payment-type.entity';
import { SaleProduct } from './sale-detail.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  code: string; // VF-0001

  @Column({ length: 150 })
  customer: string;

  @Column({ name: 'identity_card', length: 20 })
  identityCard: string;

  @CreateDateColumn({ type: 'timestamp' })
  date: Date;

  @Column({ type: 'enum', enum: SaleState, default: SaleState.GENERATED })
  state: SaleState;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ name: 'payment_location_id', type: 'int' })
  paymentLocationId: number;

  @ManyToOne(() => PaymentType, (paymentType) => paymentType.sales, {
    nullable: false,
  })
  @JoinColumn({ name: 'payment_type_id' })
  paymentType: PaymentType;

  @Column({ name: 'transaccion_id', length: 50, nullable: true })
  transactionId: string | null;

  @ManyToOne(() => Parameter, (parameter) => parameter.sales, {
    nullable: false,
  })
  @JoinColumn({ name: 'parameter_id' })
  parameter: Parameter;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => SaleProduct, (saleProduct) => saleProduct.sale, { cascade: true })
  saleProducts: SaleProduct[];
}
