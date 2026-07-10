import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AutomationRule } from './automation-rule.entity';
import { Contact } from '../contacts/contact.entity';

export enum AutomationExecutionStatus {
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('automation_executions')
@Unique(['ruleId', 'contactId', 'dedupeKey'])
export class AutomationExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  ruleId: string;

  @ManyToOne(() => AutomationRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruleId' })
  rule: AutomationRule;

  @Column()
  contactId: string;

  @ManyToOne(() => Contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  /**
   * Chave de deduplicação composta por tipo:
   * birthday:         "birthday-{ano}"          → 1 disparo por ano
   * payment_overdue:  "overdue-{saleId}"         → 1 disparo por venda
   * repurchase:       "repurchase-{productId}-{data}" → 1 disparo por ciclo
   */
  @Column()
  dedupeKey: string;

  @Column({ type: 'varchar', nullable: true })
  conversationId: string | null;

  @Column({ type: 'text', nullable: true })
  resolvedMessage: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  resolvedTemplateVariables: string[] | null;

  @Column({ type: 'enum', enum: AutomationExecutionStatus })
  status: AutomationExecutionStatus;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
