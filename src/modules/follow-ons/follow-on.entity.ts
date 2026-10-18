import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Contact } from '../contacts/contact.entity';
import { WhatsappNumber } from '../whatsapp/whatsapp-number.entity';
import { ActivityType } from '../teams/activity-type.entity';

export enum FollowOnType {
  MEETING = 'meeting',
  CALL = 'call',
  MESSAGE = 'message',
  MESSAGE_MANUAL = 'message_manual',
  // Registro instantâneo (sem pendência) — diferente das atividades acima,
  // que seguem o ciclo pending → done/cancelled.
  NOTE = 'note',
}

export enum FollowOnStatus {
  PENDING = 'pending',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

@Entity('follow_ons')
export class FollowOn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  contactId: string;

  @ManyToOne(() => Contact, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column({ nullable: true })
  whatsappNumberId: string | null;

  @ManyToOne(() => WhatsappNumber, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'whatsappNumberId' })
  whatsappNumber: WhatsappNumber | null;

  @Column({ nullable: true })
  assignedUserId: string | null;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'assignedUserId' })
  assignedUser: User | null;

  @Column({ type: 'enum', enum: FollowOnType })
  type: FollowOnType;

  // Tipo de atividade pra fins de meta de produtividade — independente do
  // "type" acima (que só rege comportamento: envio de mensagem, nota instantânea).
  @Column({ nullable: true })
  activityTypeId: string | null;

  @ManyToOne(() => ActivityType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'activityTypeId' })
  activityType: ActivityType | null;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ nullable: true })
  title: string | null;

  // Descrição/resultado da atividade — mantém o nome de coluna "note" por
  // compatibilidade com dados já existentes, mas na UI aparece como "Descrição".
  @Column({ nullable: true })
  note: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ nullable: true })
  templateName: string | null;

  @Column({ nullable: true })
  templateLanguage: string | null;

  @Column({ type: 'json', nullable: true })
  templateVariables: string[] | null;

  @Column({ type: 'enum', enum: FollowOnStatus, default: FollowOnStatus.PENDING })
  status: FollowOnStatus;

  @Column({ nullable: true })
  sentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
