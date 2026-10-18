import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../companies/company.entity';

// Nomes dos 4 tipos semeados por empresa (signup em auth.service.ts e
// migration 1700000000035 têm que usar exatamente esses literais).
export const DEFAULT_ACTIVITY_TYPE_NAMES = ['Tarefa', 'Reunião', 'Visita presencial', 'Reunião presencial'];

@Entity('activity_types')
export class ActivityType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
