import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../companies/company.entity';
import { WhatsappNumber } from '../whatsapp/whatsapp-number.entity';
import { BroadcastRecipient } from './broadcast-recipient.entity';

export enum BroadcastType {
  TEXT = 'text',
  TEMPLATE = 'template',
}

export enum BroadcastStatus {
  DRAFT = 'draft',
  QUEUED = 'queued',
  SENDING = 'sending',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  FAILED = 'failed',
}

@Entity('broadcasts')
export class Broadcast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  name: string;

  @Column()
  whatsappNumberId: string;

  @ManyToOne(() => WhatsappNumber)
  @JoinColumn({ name: 'whatsappNumberId' })
  whatsappNumber: WhatsappNumber;

  @Column({ type: 'enum', enum: BroadcastType })
  type: BroadcastType;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ nullable: true })
  templateName: string | null;

  @Column({ nullable: true, default: 'pt_BR' })
  templateLanguage: string | null;

  @Column({ type: 'enum', enum: BroadcastStatus, default: BroadcastStatus.DRAFT })
  status: BroadcastStatus;

  @Column({ type: 'int', default: 0 })
  totalCount: number;

  @Column({ type: 'int', default: 0 })
  sentCount: number;

  @Column({ type: 'int', default: 0 })
  failedCount: number;

  @Column({ type: 'text', nullable: true })
  campaignPrompt: string | null;

  @Column({ nullable: true })
  scheduledAt: Date | null;

  @Column({ nullable: true })
  startedAt: Date | null;

  @Column({ nullable: true })
  completedAt: Date | null;

  @OneToMany(() => BroadcastRecipient, (r) => r.broadcast)
  recipients: BroadcastRecipient[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
