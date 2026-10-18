import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Team } from './team.entity';
import { User } from '../users/user.entity';
import { ActivityType } from './activity-type.entity';

export enum GoalMetric {
  CONTACTS_CREATED = 'contacts_created',
  FOLLOWUP_MESSAGES = 'followup_messages',
  // Valores legados, mantidos só pra não quebrar o tipo enum do Postgres —
  // nenhum código novo gera essas duas, foram substituídas por ACTIVITY
  // (que aponta pra um ActivityType dinâmico via activityTypeId).
  TASKS_COMPLETED = 'tasks_completed',
  MEETINGS_HELD = 'meetings_held',
  ACTIVITY = 'activity',
}

export enum GoalPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum GoalScope {
  USER = 'user',
  TEAM = 'team',
}

@Entity('productivity_goals')
export class ProductivityGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column({ type: 'enum', enum: GoalScope })
  scope: GoalScope;

  // Setado quando scope = user
  @Column({ nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  // Setado quando scope = team
  @Column({ nullable: true })
  teamId: string | null;

  @ManyToOne(() => Team, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team | null;

  @Column({ type: 'enum', enum: GoalMetric })
  metric: GoalMetric;

  // Setado quando metric = ACTIVITY — qual tipo de atividade (Tarefa/Reunião/
  // Visita presencial/custom) essa meta conta.
  @Column({ nullable: true })
  activityTypeId: string | null;

  @ManyToOne(() => ActivityType, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'activityTypeId' })
  activityType: ActivityType | null;

  @Column({ type: 'int' })
  targetCount: number;

  @Column({ type: 'enum', enum: GoalPeriod })
  period: GoalPeriod;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
