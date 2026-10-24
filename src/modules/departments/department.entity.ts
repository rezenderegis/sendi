import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';

// Departamento de atendimento (ex: Suporte, Financeiro) — não confundir com
// Team, que é só pra metas de produtividade e não tem relação com conversas.
// Um usuário pode pertencer a vários departamentos (M:N), diferente de Team
// (1 time por usuário via User.teamId).
@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  name: string;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'department_members',
    joinColumn: { name: 'departmentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  members: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
