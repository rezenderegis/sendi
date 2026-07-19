import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { WhatsappNumber } from './whatsapp-number.entity';

@Entity('whatsapp_templates')
@Unique(['whatsappNumberId', 'metaId'])
export class WhatsappTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  whatsappNumberId: string;

  @ManyToOne(() => WhatsappNumber)
  @JoinColumn({ name: 'whatsappNumberId' })
  whatsappNumber: WhatsappNumber;

  @Column()
  metaId: string;

  @Column()
  name: string;

  @Column()
  language: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  category: string | null;

  @Column({ nullable: true })
  rejectedReason: string | null;

  @Column({ type: 'text', nullable: true })
  bodyText: string | null;

  @Column({ type: 'int', default: 0 })
  variablesCount: number;

  @Column({ nullable: true })
  syncedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
