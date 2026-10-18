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
import { Tag } from '../tags/tag.entity';
import { KanbanColumn } from '../kanban-columns/kanban-column.entity';
import { User } from '../users/user.entity';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  phone: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  whatsappName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  companyName: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true, unique: false })
  externalId: string;

  @Column({ type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  automationOptOut: boolean;

  @Column({ nullable: true })
  kanbanColumnId: string | null;

  @ManyToOne(() => KanbanColumn, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'kanbanColumnId' })
  kanbanColumn: KanbanColumn | null;

  // Carimbado só quando kanbanColumnId muda de verdade (não em qualquer
  // edição) — base real pro indicador de "lead parado".
  @Column({ type: 'timestamptz', nullable: true })
  kanbanColumnChangedAt: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  dealValue: number | null;

  @Column({ nullable: true })
  dealOwnerId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'dealOwnerId' })
  dealOwner: User | null;

  // "Perdido" é simplesmente lostAt != null — sem enum de status separado.
  @Column({ type: 'timestamptz', nullable: true })
  lostAt: Date | null;

  @Column({ nullable: true })
  lostReason: string | null;

  // Usado só pra métrica de "contato cadastrado" das Metas de produtividade —
  // só é setado quando o contato é criado via POST /contacts explícito;
  // contatos criados por webhook/automação (findOrCreateByPhone) ficam null.
  @Column({ nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'contact_tags',
    joinColumn: { name: 'contactId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @UpdateDateColumn()
  updatedAt: Date;
}
