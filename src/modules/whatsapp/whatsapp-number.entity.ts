import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Company } from '../companies/company.entity';

@Entity('whatsapp_numbers')
export class WhatsappNumber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  phoneNumberId: string;

  @Column()
  wabaId: string;

  @Exclude()
  @Column({ select: false })
  accessToken: string;

  @Column()
  phoneNumber: string;

  @Column()
  displayName: string;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  webhookVerifyToken: string;

  @Column({ type: 'text', nullable: true })
  systemPrompt: string | null;

  @Column({ type: 'int', default: 20 })
  botHistoryLimit: number;

  @Column({ type: 'jsonb', nullable: true, default: null })
  enabledToolNames: string[] | null;

  @Column({ type: 'jsonb', nullable: true, default: null })
  enabledFlowNames: string[] | null;

  @Column({ type: 'int', nullable: true })
  dailySpendLimitCents: number | null;

  @Column({ type: 'int', nullable: true })
  monthlySpendLimitCents: number | null;

  // Secreto usado pelo webhook de disparo (sistema externo do cliente -> nossa API). Criptografado
  // com o mesmo util do accessToken. Null = webhook de disparo ainda não foi ativado pra esse número.
  @Exclude()
  @Column({ type: 'text', nullable: true, select: false })
  triggerWebhookSecret: string | null;

  // Evita notificar o admin da plataforma repetidamente no mesmo dia quando um número fica
  // bloqueado várias vezes seguidas por estourar o limite de gasto (próprio ou o padrão global).
  @Column({ type: 'timestamp', nullable: true })
  lastSpendLimitAlertAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
