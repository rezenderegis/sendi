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
import { CampaignPrompt } from '../campaign-prompts/campaign-prompt.entity';

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

  @Column({ type: 'varchar', length: 10, default: 'text' })
  messageType: 'text' | 'template';

  /**
   * Mensagem de texto livre. Variáveis: {nome}, {primeiro_nome}, {produto}, {data_vencimento}, {dias_atraso}
   * Obrigatório quando messageType = 'text'.
   */
  @Column({ type: 'text', nullable: true })
  messageTemplate: string | null;

  /** Nome do template aprovado na Meta. Obrigatório quando messageType = 'template'. */
  @Column({ nullable: true })
  templateName: string | null;

  @Column({ nullable: true, default: 'pt_BR' })
  templateLanguage: string | null;

  /**
   * Variáveis dinâmicas do template ({{1}}, {{2}}, ...).
   * Cada elemento pode conter texto estático ou variáveis: {nome}, {produto}, etc.
   * Exemplo: ["{nome}", "R$ {valor}"]
   */
  @Column({ type: 'text', array: true, nullable: true })
  templateVariables: string[] | null;

  @Column({ nullable: true })
  campaignPromptId: string | null;

  @ManyToOne(() => CampaignPrompt, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campaignPromptId' })
  campaignPromptRef: CampaignPrompt | null;

  @Column({ type: 'text', nullable: true })
  campaignPrompt: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
