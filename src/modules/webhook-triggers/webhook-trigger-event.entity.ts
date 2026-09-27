import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum WebhookTriggerStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

@Entity('webhook_trigger_events')
export class WebhookTriggerEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  whatsappNumberId: string;

  @Column()
  companyId: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  promptName: string | null;

  @Column({ nullable: true })
  flowName: string | null;

  @Column({ nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'enum', enum: WebhookTriggerStatus })
  status: WebhookTriggerStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
