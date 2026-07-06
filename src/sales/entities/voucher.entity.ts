export enum PaymentTypeState {
  PAGADO = 'PAGADO',
  GENERADO = 'GENERADO',
  RECHAZADO = 'RECHAZADO',
}

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentType } from './payment-type.entity';
import { Sale } from './sale.entity';

@Entity('vouchers')
export class Voucher {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sale, (sale) => sale.vouchers, { nullable: false })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column({ length: 150, nullable: true })
  customer: string | null;

  @Column({ name: 'identity_card_customer', length: 20, nullable: true })
  identityCardCustomer: string | null;

  @Column({ name: 'payment_location_id', type: 'int', nullable: true })
  paymentLocationId: number | null;

  @Column({ name: 'receipt_number', length: 50, nullable: true })
  receiptNumber: string | null;

  @Column({ length: 255, nullable: true })
  description: string | null;

  @ManyToOne(() => PaymentType, (paymentType) => paymentType.vouchers, {
    nullable: false,
  })
  @JoinColumn({ name: 'payment_type_id' })
  paymentType: PaymentType;

  @Column({
    name: 'payment_type_state',
    type: 'enum',
    enum: PaymentTypeState,
    enumName: 'payment_type_state_enum',
    default: PaymentTypeState.GENERADO,
  })
  paymentTypeState: PaymentTypeState;

  @Column({ name: 'deposit_date', type: 'timestamptz', nullable: true })
  depositDate: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
