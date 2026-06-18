import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Voucher } from './voucher.entity';

@Entity('qr_payments')
export class QrPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Voucher, (voucher) => voucher.qrPayment, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'voucher_id' })
  voucher: Voucher;

  @Column({ name: 'bcb_qr_id', length: 50 })
  bcbQrId: string;

  @Column({ name: 'qr_image', type: 'text' })
  qrImage: string;

  @Column({ name: 'qr_response', type: 'jsonb' })
  qrResponse: Record<string, unknown>;

  @Column({ name: '', type: 'jsonb', nullable: true })
  qrStatusResponse: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
