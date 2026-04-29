import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sale } from '../../sale/entities/sale.entity';

@Entity('sale_details')
export class SaleDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sale, (sale) => sale.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' }) // Asegúrate de que exista esta columna en tu tabla
  sale: Sale;

  // --- DATOS PLANOS DEL PRODUCTO (Snapshot) ---
  // Guardamos texto plano por seguridad histórica
  @Column({ length: 150 })
  product_name: string;

  @Column({ length: 20 })
  product_code: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unit_price: number;

  // --- DATOS ESPECIFICOS DE VENTAS ---
  @Column({ length: 50, nullable: true })
  folder_number: string; // Ej: CE-1001

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;
}