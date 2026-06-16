import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Sale } from './sale.entity';

@Entity('parameters')
export class Parameter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'max_amount_product', type: 'int', default: 0 })
  maxAmountProduct: number; // Límite monetario por venta

  @Column({ name: 'max_products', type: 'int', default: 1 })
  maxProducts: number; // Límite de items (carrito) por venta

  @Column({ name: 'currency_symbol', type: 'varchar', length: 4 })
  currencySymbol: string; // Moneda para las ventas, por ejemplo 'USD', 'EUR', etc.

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => Sale, (sale) => sale.parameter)
  sales: Sale[];
}
