import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ConversationEventType {
  CAMPAIGN_ACTIVATED = 'campaign_activated',
  CAMPAIGN_RESET_HUMAN = 'campaign_reset_human',
  CAMPAIGN_RESET_MANUAL = 'campaign_reset_manual',
  CAMPAIGN_EXPIRED = 'campaign_expired',
}

@Entity('conversation_events')
export class ConversationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @Column({ type: 'enum', enum: ConversationEventType })
  type: ConversationEventType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
