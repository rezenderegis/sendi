import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Professional } from './professional.entity';

// Disponibilidade semanal recorrente — várias linhas por profissional por
// dia (ex: turno manhã + turno tarde), não é "1 intervalo por dia".
@Entity('professional_availability')
export class ProfessionalAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  professionalId: string;

  @ManyToOne(() => Professional, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'professionalId' })
  professional: Professional;

  @Column()
  companyId: string;

  // 0 = domingo ... 6 = sábado (mesma convenção de Date.getDay() em JS/Dart)
  @Column({ type: 'int' })
  weekday: number;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;
}
