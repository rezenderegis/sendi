import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Broadcast } from './broadcast.entity';
import { Contact } from '../contacts/contact.entity';

export enum RecipientStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

export enum ResponseSentiment {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
}

@Entity('broadcast_recipients')
@Unique(['broadcastId', 'contactId'])
export class BroadcastRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  broadcastId: string;

  @ManyToOne(() => Broadcast, (b) => b.recipients)
  @JoinColumn({ name: 'broadcastId' })
  broadcast: Broadcast;

  @Column()
  contactId: string;

  @ManyToOne(() => Contact)
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column({ type: 'enum', enum: RecipientStatus, default: RecipientStatus.PENDING })
  status: RecipientStatus;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'text', nullable: true })
  customMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  templateVariables: string[] | null;

  @Column({ nullable: true })
  sentAt: Date | null;

  @Column({ nullable: true })
  respondedAt: Date | null;

  @Column({ type: 'enum', enum: ResponseSentiment, nullable: true })
  responseSentiment: ResponseSentiment | null;

  @CreateDateColumn()
  createdAt: Date;
}
