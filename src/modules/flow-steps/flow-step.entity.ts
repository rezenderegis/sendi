import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Flow } from './flow.entity';

export enum FlowStepType {
  CHOICE = 'choice',
  TEXT = 'text',
  CONTENT = 'content',
  CONDITION = 'condition',
  ACTION = 'action',
}

export enum FlowConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  IS_EMPTY = 'is_empty',
  IS_FILLED = 'is_filled',
}

export type SaveAsVariable = { name: string; scope: 'contact' | 'conversation' };

export interface FlowStepOption {
  id: string;
  label: string;
  value: string;
  nextStepId: string | null;
  // Só considerado quando nextStepId é null. Se preenchido, encerra o fluxo enviando essa mensagem fixa.
  // Se null/vazio, encerra o fluxo e devolve o controle pra IA imediatamente (ela vê a pergunta+resposta no histórico).
  endMessage: string | null;
  // Quando preenchido, salva o `value` da opção escolhida como variável — no contato (permanente) ou na conversa (só esse atendimento).
  saveAsVariable: SaveAsVariable | null;
}

export interface ChoiceConfig {
  questionText: string;
  options: FlowStepOption[];
  onAnswerActionName?: string | null;
}

export interface TextConfig {
  questionText: string;
  endMessage: string | null;
  saveAsVariable: SaveAsVariable | null;
  onAnswerActionName?: string | null;
}

export interface ContentConfig {
  contentType: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  caption?: string;
}

export interface FlowConditionBranch {
  id: string;
  operator: FlowConditionOperator;
  value?: string;
  nextStepId: string | null;
}

export interface ConditionConfig {
  expression: string;
  branches: FlowConditionBranch[];
  elseStepId: string | null;
}

export type FlowActionType =
  | 'add_tag'
  | 'remove_tag'
  | 'update_contact'
  | 'assign_user'
  | 'close_conversation'
  | 'start_flow';

export interface ActionConfig {
  actionType: FlowActionType;
  tagId?: string;
  contactField?: string;
  contactValue?: string;
  userId?: string;
  closeReason?: string;
  flowName?: string;
}

export type FlowStepConfig = ChoiceConfig | TextConfig | ContentConfig | ConditionConfig | ActionConfig;

@Entity('flow_steps')
export class FlowStep {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  flowId: string;

  @ManyToOne(() => Flow, (flow) => flow.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flowId' })
  flow: Flow;

  @Column({ type: 'enum', enum: FlowStepType, default: FlowStepType.CHOICE })
  stepType: FlowStepType;

  @Column({ type: 'jsonb' })
  config: FlowStepConfig;

  // Só usado quando stepType é text | content | action (blocos lineares, um único caminho adiante).
  // choice usa config.options[].nextStepId; condition usa config.branches[].nextStepId + config.elseStepId.
  @Column({ type: 'uuid', nullable: true })
  nextStepId: string | null;

  @Column({ type: 'float', default: 0 })
  positionX: number;

  @Column({ type: 'float', default: 0 })
  positionY: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
