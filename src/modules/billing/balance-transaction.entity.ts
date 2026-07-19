import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Company } from '../companies/company.entity';

export enum BalanceTransactionType {
  CREDIT = 'credit',
  ADJUSTMENT = 'adjustment',
}

// Registra apenas créditos/ajustes manuais de saldo — o débito por mensagem
// enviada já fica implícito em messages.costCents, não duplicamos aqui.
@Entity('balance_transactions')
export class BalanceTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ type: 'int' })
  amountCents: number;

  @Column({ type: 'enum', enum: BalanceTransactionType, default: BalanceTransactionType.CREDIT })
  type: BalanceTransactionType;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ nullable: true })
  createdByUserId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
