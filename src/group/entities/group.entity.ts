import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string; // 'FOLDERS', 'GASTOS ADMINISTRATIVOS'

  @Column({ type: 'int' })
  account_id: number; // Referencia a contabilidad (Global Service)
}
