import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum LeadSource {
  FORM = 'form',
  WHATSAPP = 'whatsapp',
}

export enum LeadBrand {
  SENDE = 'sende',
  GLOBALSIX = 'globalsix',
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

  @Column({ type: 'enum', enum: LeadBrand, default: LeadBrand.SENDE })
  brand: LeadBrand;

  @CreateDateColumn()
  createdAt: Date;
}
