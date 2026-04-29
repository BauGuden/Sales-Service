import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('parameters')
export class Parameter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  max_amount: number; // Límite monetario por venta

  @Column({ type: 'int', default: 1 })
  max_products: number; // Límite de items (carrito) por venta
}