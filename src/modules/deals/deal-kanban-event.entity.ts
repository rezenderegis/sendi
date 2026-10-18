import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum DealKanbanEventAction {
  MOVED = 'moved',
  LOST = 'lost',
  REOPENED = 'reopened',
}

// Histórico de movimentação de raia / perda / reabertura de um negócio —
// usado pelo relatório de funil (contagem de entradas por raia no período).
@Entity('deal_kanban_events')
export class DealKanbanEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  dealId: string;

  @Column({ nullable: true })
  fromColumnId: string | null;

  @Column({ nullable: true })
  toColumnId: string | null;

  @Column({ type: 'enum', enum: DealKanbanEventAction })
  action: DealKanbanEventAction;

  @Column({ nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
