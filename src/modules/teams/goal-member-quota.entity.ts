import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ProductivityGoal } from './productivity-goal.entity';
import { User } from '../users/user.entity';

// Tabela esparsa: vazia pra uma meta = divisão igual entre os membros (calculada
// em tempo de leitura); preenchida = cota customizada, tudo-ou-nada (o endpoint
// de escrita exige que a soma das cotas seja igual à meta da equipe).
@Entity('goal_member_quotas')
export class GoalMemberQuota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  goalId: string;

  @ManyToOne(() => ProductivityGoal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goalId' })
  goal: ProductivityGoal;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int' })
  quota: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
