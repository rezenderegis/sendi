import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WhatsappNumber } from '../whatsapp/whatsapp-number.entity';

export enum AutomationTriggerType {
  BIRTHDAY = 'birthday',
  PAYMENT_OVERDUE = 'payment_overdue',
  REPURCHASE = 'repurchase',
}

@Entity('automation_rules')
export class AutomationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AutomationTriggerType })
  type: AutomationTriggerType;

  @Column()
  whatsappNumberId: string;

  @ManyToOne(() => WhatsappNumber, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'whatsappNumberId' })
  whatsappNumber: WhatsappNumber;

  /**
   * Dias de antecipação (negativo) ou atraso (positivo) em relação ao evento.
   * birthday/repurchase: -3 = dispara 3 dias antes. 0 = no dia.
   * payment_overdue: 0 = no dia do vencimento, 3 = 3 dias depois de vencer.
   */
  @Column({ type: 'int', default: 0 })
  triggerOffsetDays: number;

  /**
   * Template da mensagem. Variáveis suportadas:
   * {nome}, {primeiro_nome}, {produto}, {data_vencimento}, {dias_atraso}
   */
  @Column({ type: 'text' })
  messageTemplate: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
