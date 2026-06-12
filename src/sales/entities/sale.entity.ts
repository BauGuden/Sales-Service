export enum SaleState {
  VIGENTE = 'VIGENTE',
  ANULADO = 'ANULADO',
}

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Parameter } from './parameter.entity';
import { SaleProduct } from './sale-detail.entity';
import { Voucher } from './voucher.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  code: string; // VF-0001

  @Column({
    name: 'sale_state',
    type: 'enum',
    enum: SaleState,
    enumName: 'sale_state_enum',
    default: SaleState.VIGENTE,
  })
  saleState: SaleState;

  @Column({ name: 'person_id', type: 'int' })
  personId: number;

  @Column({ type: 'timestamp', default: () => 'now()' })
  date: Date;

  @Column({ name: 'transaccion_id', length: 50, nullable: true })
  transactionId: string | null;

  @ManyToOne(() => Parameter, (parameter) => parameter.sales, {
    nullable: false,
  })
  @JoinColumn({ name: 'parameter_id' })
  parameter: Parameter;

  @OneToMany(() => Voucher, (voucher) => voucher.sale)
  vouchers: Voucher[];

  @OneToMany(() => SaleProduct, (saleProduct) => saleProduct.sale, {
    cascade: true,
  })
  saleProducts: SaleProduct[];
}
