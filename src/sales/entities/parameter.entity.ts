import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SaleProduct } from './sale-detail.entity';

@Entity('parameters')
export class Parameter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'max_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  maxAmount: number; // Límite monetario por venta

  @Column({ name: 'max_products', type: 'int', default: 1 })
  maxProducts: number; // Límite de items (carrito) por venta

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => SaleProduct, (saleProduct) => saleProduct.parameter)
  saleProducts: SaleProduct[];
}
