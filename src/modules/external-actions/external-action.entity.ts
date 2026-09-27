import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../companies/company.entity';

export enum ExternalActionMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
}

@Entity('external_actions')
export class ExternalAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: ExternalActionMethod, default: ExternalActionMethod.POST })
  method: ExternalActionMethod;

  @Column()
  url: string;

  @Column({ type: 'jsonb', nullable: true })
  headersTemplate: Record<string, string> | null;

  @Column({ type: 'jsonb', nullable: true })
  bodyTemplate: Record<string, any> | null;

  @Column({ type: 'jsonb' })
  parametersSchema: Record<string, any>;

  @Column({ type: 'text', nullable: true, select: false })
  accessToken: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 8000 })
  timeoutMs: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
