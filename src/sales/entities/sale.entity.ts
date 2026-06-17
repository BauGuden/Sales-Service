export enum SaleState {
  VIGENTE = 'VIGENTE',
  PENDIENTE = 'PENDIENTE',
  ANULADO = 'ANULADO',
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
import { SaleProduct } from './sale-detail.entity';
import { Voucher } from './voucher.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true, nullable: true })
  code: string | null;

  @Column({
    name: 'sale_state',
    type: 'enum',
    enum: SaleState,
    enumName: 'sale_state_enum',
    default: SaleState.PENDIENTE,
  })
  saleState: SaleState = SaleState.PENDIENTE;

  @Column({ name: 'person_uuid', type: 'uuid' })
  personUuid: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date: Date;

  @Column({ name: 'transaccion_id', length: 50, nullable: true })
  transactionId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

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
