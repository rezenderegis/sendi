import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Company } from '../companies/company.entity';

@Entity('whatsapp_numbers')
export class WhatsappNumber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  phoneNumberId: string;

  @Column()
  wabaId: string;

  @Exclude()
  @Column({ select: false })
  accessToken: string;

  @Column()
  phoneNumber: string;

  @Column()
  displayName: string;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  webhookVerifyToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
