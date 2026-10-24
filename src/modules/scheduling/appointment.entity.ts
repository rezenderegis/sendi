import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Contact } from '../contacts/contact.entity';
import { Professional } from './professional.entity';
import { Service } from './service.entity';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  contactId: string;

  @ManyToOne(() => Contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  // SET NULL — o agendamento (histórico) não deve desaparecer se o
  // profissional/serviço for removido do cadastro depois.
  @Column({ nullable: true })
  professionalId: string | null;

  @ManyToOne(() => Professional, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'professionalId' })
  professional: Professional | null;

  @Column({ nullable: true })
  serviceId: string | null;

  @ManyToOne(() => Service, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'serviceId' })
  service: Service | null;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  // Copiado do serviço no momento do agendamento — não recalcula
  // retroativamente se a duração do serviço mudar depois.
  @Column({ type: 'int' })
  durationMinutes: number;

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.SCHEDULED })
  status: AppointmentStatus;

  @Column({ nullable: true })
  notes: string | null;

  @Column({ nullable: true })
  reminderSentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
