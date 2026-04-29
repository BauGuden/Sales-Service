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
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { SaleDetail } from '../../sale-detail/entities/sale-detail.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  code: string; // VF-0001

  // --- 1. DATOS DEL PAGADOR (CUSTOMER) ---
  @Column({ length: 150 })
  customer_name: string;

  @Column({ length: 20 })
  customer_ci: string;

  // --- 2. DATOS DEL BENEFICIARIO (AFFILIATE/PERSON) ---
  @Column({ length: 150 })
  affiliate_name: string;

  @Column({ length: 20 })
  affiliate_ci: string;

  // --- 3. DATOS DE LA VENTA ---
  @CreateDateColumn({ name: 'date' })
  date: Date;

  @Column({ type: 'enum', enum: SaleState, default: SaleState.GENERATED })
  state: SaleState;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  // --- 4. DATOS DE PAGO ---
  @Column({ type: 'int' })
  payment_type_id: number;

  @Column({ type: 'int' })
  payment_location_id: number;

  @Column({ length: 50, nullable: true })
  voucher_number: string;

  @Column({ type: 'date', nullable: true })
  receipt_date: Date;

  @Column({ length: 20, nullable: true })
  transaction_code: string; // Código de Collections-Service

  // --- 5. AUDITORÍA Y CONTROL ---
  
  // Se actualiza automáticamente cada vez que haces save()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date; 

  // Se usa para "borrar" lógicamente (no borrar el registro físico)
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  // --- RELACIONES ---
  @OneToMany(() => SaleDetail, (detail) => detail.sale, { cascade: true })
  details: SaleDetail[];
}