import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum LeadSource {
  FORM = 'form',
  WHATSAPP = 'whatsapp',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column({ type: 'enum', enum: LeadSource, default: LeadSource.FORM })
  source: LeadSource;

  @CreateDateColumn()
  createdAt: Date;
}
