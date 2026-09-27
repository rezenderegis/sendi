import { Injectable } from '@nestjs/common';
import { FlowStepsService } from './flow-steps.service';
import { FlowsService } from './flows.service';
import { ContactsService } from '../contacts/contacts.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ConversationEventType } from '../conversations/conversation-event.entity';
import { ConversationStatus } from '../conversations/conversation.entity';
import { Contact } from '../contacts/contact.entity';
import {
  FlowStep,
  FlowStepType,
  FlowStepOption,
  ChoiceConfig,
  TextConfig,
  ContentConfig,
  ConditionConfig,
  ActionConfig,
  FlowConditionOperator,
} from './flow-step.entity';

export interface FlowMessageSink {
  sendText(text: string): Promise<void>;
  sendChoice(questionText: string, options: FlowStepOption[]): Promise<void>;
  sendImage(imageUrl: string, caption?: string): Promise<void>;
}

/**
 * Motor de execução do Fluxo Guiado, compartilhado entre o processamento real de mensagens
 * inbound do WhatsApp (whatsapp.processor.ts) e o simulador de prompt (/ai/test-chat). O envio
 * de mensagens é abstraído via FlowMessageSink pra não acoplar esse motor ao WhatsApp; o parâmetro
 * `isSimulated` desliga apenas as escritas de dados que exigiriam um contato/conversa reais
 * (tag, atualizar contato, transferir, encerrar) — condição e conteúdo rodam idênticos nos dois casos.
 */
@Injectable()
export class FlowEngineService {
  constructor(
    private readonly flowStepsService: FlowStepsService,
    private readonly flowsService: FlowsService,
    private readonly contactsService: ContactsService,
    private readonly conversationsService: ConversationsService,
  ) {}

  isPausingBlock(step: FlowStep): boolean {
    return step.stepType === FlowStepType.CHOICE || step.stepType === FlowStepType.TEXT;
  }

  buildToolContext(contact: Contact, conversation: any): Record<string, any> {
    return {
      ...(contact.metadata ?? {}),
      ...(conversation.variables ?? {}),
      contactName: contact.name,
      contactPhone: contact.phone,
      contactEmail: contact.email ?? '',
      contactCompanyName: contact.companyName ?? '',
      contactExternalId: contact.externalId ?? '',
      contactBirthDate: contact.birthDate ?? '',
      conversationId: conversation.id,
    };
  }

  resolveTemplate(template: string, vars: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : '',
    );
  }

  evaluateConditionBranch(resolvedValue: string, branch: { operator: FlowConditionOperator; value?: string }): boolean {
    const left = resolvedValue.trim().toLowerCase();
    const right = (branch.value ?? '').trim().toLowerCase();
    switch (branch.operator) {
      case FlowConditionOperator.EQUALS:
        return left === right;
      case FlowConditionOperator.NOT_EQUALS:
        return left !== right;
      case FlowConditionOperator.CONTAINS:
        return left.includes(right);
      case FlowConditionOperator.NOT_CONTAINS:
        return !left.includes(right);
      case FlowConditionOperator.IS_EMPTY:
        return left === '';
      case FlowConditionOperator.IS_FILLED:
        return left !== '';
      default:
        return false;
    }
  }

  async sendFlowStepPrompt(sink: FlowMessageSink, step: FlowStep): Promise<void> {
    if (step.stepType === FlowStepType.TEXT) {
      const cfg = step.config as TextConfig;
      await sink.sendText(cfg.questionText);
    } else {
      const cfg = step.config as ChoiceConfig;
      await sink.sendChoice(cfg.questionText, cfg.options);
    }
  }

  /**
   * Entra num bloco do Fluxo Guiado. Blocos automáticos (Conteúdo/Condição/Ação) executam e
   * encadeiam imediatamente, sem esperar resposta; a cadeia para no primeiro bloco pausável
   * (Múltipla escolha/Resposta livre) ou quando não há mais próximo passo.
   */
  async enterFlowStep(
    companyId: string,
    contact: Contact,
    conversation: any,
    sink: FlowMessageSink,
    startStep: FlowStep,
    isSimulated = false,
  ): Promise<{ paused: FlowStep } | { fellThrough: true }> {
    let current: FlowStep | null = startStep;
    const visited = new Set<string>();
    while (current && !this.isPausingBlock(current)) {
      if (visited.has(current.id)) {
        current = null;
        break;
      }
      visited.add(current.id);
      current = await this.runAutoBlock(current, contact, conversation, companyId, sink, isSimulated);
    }

    if (!current) {
      if (!isSimulated) await this.conversationsService.updateAiState(conversation.id, null);
      return { fellThrough: true };
    }

    if (!isSimulated) await this.conversationsService.updateAiState(conversation.id, `flow:${current.id}`);
    await this.sendFlowStepPrompt(sink, current);
    return { paused: current };
  }

  private async runAutoBlock(
    step: FlowStep,
    contact: Contact,
    conversation: any,
    companyId: string,
    sink: FlowMessageSink,
    isSimulated: boolean,
  ): Promise<FlowStep | null> {
    let nextId: string | null = null;

    if (step.stepType === FlowStepType.CONTENT) {
      const cfg = step.config as ContentConfig;
      const vars = this.buildToolContext(contact, conversation);
      if (cfg.contentType === 'image' && cfg.imageUrl) {
        await sink.sendImage(this.resolveTemplate(cfg.imageUrl, vars), cfg.caption ? this.resolveTemplate(cfg.caption, vars) : undefined);
      } else {
        await sink.sendText(this.resolveTemplate(cfg.text ?? '', vars));
      }
      nextId = step.nextStepId;
    } else if (step.stepType === FlowStepType.CONDITION) {
      const cfg = step.config as ConditionConfig;
      const vars = this.buildToolContext(contact, conversation);
      const resolved = this.resolveTemplate(cfg.expression ?? '', vars);
      const matched = cfg.branches.find((b) => this.evaluateConditionBranch(resolved, b));
      nextId = matched ? matched.nextStepId : cfg.elseStepId;
    } else if (step.stepType === FlowStepType.ACTION) {
      const cfg = step.config as ActionConfig;
      nextId = await this.executeFlowAction(cfg, contact, conversation, companyId, step.nextStepId, sink, isSimulated);
    }

    return nextId ? this.flowStepsService.findById(companyId, nextId) : null;
  }

  private async executeFlowAction(
    cfg: ActionConfig,
    contact: Contact,
    conversation: any,
    companyId: string,
    defaultNextStepId: string | null,
    sink: FlowMessageSink,
    isSimulated: boolean,
  ): Promise<string | null> {
    const vars = this.buildToolContext(contact, conversation);
    let nextId = defaultNextStepId;

    const needsRealContactOrConversation = ['add_tag', 'remove_tag', 'update_contact', 'assign_user', 'close_conversation'].includes(
      cfg.actionType,
    );
    if (isSimulated && needsRealContactOrConversation) {
      await sink.sendText(`⚙️ [simulado] ação "${cfg.actionType}" não aplicada — precisa de um contato/conversa reais.`);
    } else {
      switch (cfg.actionType) {
        case 'add_tag':
          if (cfg.tagId) await this.contactsService.addTag(contact.id, companyId, cfg.tagId);
          break;
        case 'remove_tag':
          if (cfg.tagId) await this.contactsService.removeTag(contact.id, companyId, cfg.tagId);
          break;
        case 'update_contact':
          if (cfg.contactField?.startsWith('metadata:')) {
            await this.contactsService.setMetadataField(
              contact.id,
              companyId,
              cfg.contactField.slice(9),
              this.resolveTemplate(cfg.contactValue ?? '', vars),
            );
          } else if (cfg.contactField) {
            await this.contactsService.update(contact.id, companyId, {
              [cfg.contactField]: this.resolveTemplate(cfg.contactValue ?? '', vars),
            } as any);
          }
          break;
        case 'assign_user':
          if (cfg.userId) await this.conversationsService.updateStatus(conversation.id, companyId, undefined, cfg.userId);
          break;
        case 'close_conversation':
          await this.conversationsService.updateStatus(conversation.id, companyId, ConversationStatus.CLOSED);
          break;
      }
    }

    if (cfg.actionType === 'start_flow') {
      const flow = (await this.flowsService.findAll(companyId)).find((f) => f.name === cfg.flowName);
      nextId = flow?.startStepId ?? null;
    }

    if (!isSimulated) {
      await this.conversationsService.createEvent(conversation.id, ConversationEventType.FLOW_ACTION_EXECUTED, {
        actionType: cfg.actionType,
        ...cfg,
      });
    }

    return nextId;
  }
}
