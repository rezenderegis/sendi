import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Contact } from '../contacts/contact.entity';
import { KanbanColumn } from '../kanban-columns/kanban-column.entity';
import { User } from '../users/user.entity';

// Um negócio pertence a um contato, mas um contato pode ter vários negócios
// (compra de novo, outra frente de venda, etc) — é o Deal que carrega raia,
// valor, dono e status de perda, não mais o Contact.
@Entity('deals')
export class Deal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  contactId: string;

  @ManyToOne(() => Contact, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  // Gerado automaticamente ao criar (nome do contato, ou "Nome — Negócio N"
  // a partir do segundo) — sempre editável depois.
  @Column()
  title: string;

  @Column({ nullable: true })
  kanbanColumnId: string | null;

  @ManyToOne(() => KanbanColumn, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'kanbanColumnId' })
  kanbanColumn: KanbanColumn | null;

  // Carimbado só quando kanbanColumnId muda de verdade — base pro indicador de "parado".
  @Column({ type: 'timestamptz', nullable: true })
  kanbanColumnChangedAt: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  dealValue: number | null;

  @Column({ nullable: true })
  dealOwnerId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'dealOwnerId' })
  dealOwner: User | null;

  // "Perdido" é simplesmente lostAt != null — sem enum de status separado.
  @Column({ type: 'timestamptz', nullable: true })
  lostAt: Date | null;

  @Column({ nullable: true })
  lostReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
