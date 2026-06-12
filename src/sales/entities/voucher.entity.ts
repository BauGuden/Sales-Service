export enum PaymentTypeState {
  PAGADO = 'PAGADO',
  PENDIENTE = 'PENDIENTE',
  NO_PAGADO = 'NO PAGADO',
}

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
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

  @Column({ length: 150 })
  customer: string;

  @Column({ name: 'identity_card_customer', length: 20 })
  identityCardCustomer: string;

  @Column({ name: 'payment_location_id', type: 'int' })
  paymentLocationId: number;

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
    default: PaymentTypeState.PENDIENTE,
  })
  paymentTypeState: PaymentTypeState;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;
}
