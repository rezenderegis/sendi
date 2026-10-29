import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum CompanyPlan {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'enum', enum: CompanyPlan, default: CompanyPlan.FREE })
  plan: CompanyPlan;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  balanceCents: number;

  // Quais produtos essa empresa tem acesso — controla o que aparece no menu
  // do dashboard (ex: 'crm' = conversas/WhatsApp/vendas, 'pages' =
  // GlobalSixPages). Lista simples (não tabela própria) porque só o admin
  // da plataforma mexe nisso, não precisa de metadata por módulo.
  @Column({ type: 'jsonb', default: () => `'["crm"]'` })
  enabledModules: string[];

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
