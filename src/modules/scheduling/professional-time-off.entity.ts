import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Professional } from './professional.entity';

// Exceção pontual por cima da disponibilidade semanal — férias, feriado,
// atestado. startTime/endTime nulos = bloqueia o dia inteiro; preenchidos =
// bloqueia só aquele intervalo naquele dia.
@Entity('professional_time_off')
export class ProfessionalTimeOff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  professionalId: string;

  @ManyToOne(() => Professional, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'professionalId' })
  professional: Professional;

  @Column()
  companyId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time', nullable: true })
  startTime: string | null;

  @Column({ type: 'time', nullable: true })
  endTime: string | null;

  @Column({ nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
