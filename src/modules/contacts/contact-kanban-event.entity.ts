import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ContactKanbanEventAction {
  MOVED = 'moved',
  LOST = 'lost',
  REOPENED = 'reopened',
}

// Histórico de movimentação de raia / perda / reabertura de um lead —
// usado pelo relatório de funil (contagem de entradas por raia no período).
@Entity('contact_kanban_events')
export class ContactKanbanEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  contactId: string;

  @Column({ nullable: true })
  fromColumnId: string | null;

  @Column({ nullable: true })
  toColumnId: string | null;

  @Column({ type: 'enum', enum: ContactKanbanEventAction })
  action: ContactKanbanEventAction;

  @Column({ nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
