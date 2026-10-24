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
import { Service } from './service.entity';

// Profissional que presta um ou mais serviços (ex: dentista, médico) —
// cadastro leve e independente, sem login, sem vínculo obrigatório com User
// (decisão confirmada: nem todo profissional usa o sistema).
@Entity('professionals')
export class Professional {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  name: string;

  @Column({ nullable: true })
  specialty: string | null;

  @Column({ default: true })
  isActive: boolean;

  @ManyToMany(() => Service)
  @JoinTable({
    name: 'professional_services',
    joinColumn: { name: 'professionalId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'serviceId', referencedColumnName: 'id' },
  })
  services: Service[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
