import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum FollowOnType {
  MEETING = 'meeting',
  CALL = 'call',
  MESSAGE = 'message',
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
  conversationId: string;

  @Column({ nullable: true })
  assignedUserId: string | null;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'assignedUserId' })
  assignedUser: User | null;

  @Column({ type: 'enum', enum: FollowOnType })
  type: FollowOnType;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

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
}
