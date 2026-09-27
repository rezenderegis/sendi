import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Job, Queue } from 'bull';
import axios from 'axios';
import { ConversationsService } from '../conversations/conversations.service';
import { ConversationEventType } from '../conversations/conversation-event.entity';
import { ContactsService } from '../contacts/contacts.service';
import { FlowStep, FlowStepType, ChoiceConfig, TextConfig } from '../flow-steps/flow-step.entity';
import { AiService, DEFAULT_BOT_HISTORY_LIMIT } from '../ai/ai.service';
import { WhatsappService } from './whatsapp.service';
import { ExternalActionsService } from '../external-actions/external-actions.service';
import { FlowStepsService } from '../flow-steps/flow-steps.service';
import { FlowsService } from '../flow-steps/flows.service';
import { FlowEngineService } from '../flow-steps/flow-engine.service';
import { Message, MessageDirection, MessageStatus, MessageType } from '../conversations/message.entity';
import { Broadcast } from '../broadcasts/broadcast.entity';
import { CampaignPrompt } from '../campaign-prompts/campaign-prompt.entity';
import { BroadcastRecipient, RecipientStatus } from '../broadcasts/broadcast-recipient.entity';
import { AutomationExecution, AutomationExecutionStatus } from '../automations/automation-execution.entity';
import { phoneAlternative } from '../../common/utils/phone.util';
import { decrypt } from '../../common/utils/crypto.util';

const HUMAN_WORDS = [
  'humano', 'humana',
  'pessoa', 'pessoas',
  'atendente', 'atendentes',
  'consultor', 'consultora', 'consultores', 'consultoras',
  'responsavel', 'responsaveis',
  'gerente', 'gerentes',
  'supervisor', 'supervisora',
  'especialista', 'especialistas',
  'agente', 'agentes',
  'representante', 'representantes',
  'vendedor', 'vendedora',
  'funcionario', 'funcionaria',
  'colaborador', 'colaboradora',
  'real', 'alguem', 'alguien',
  'time', 'equipe',
];

const ACTION_WORDS = [
  'falar', 'conversar', 'chamar', 'transferir', 'transfere',
  'passa', 'passem', 'conectar', 'conecta',
  'quero', 'preciso', 'gostaria', 'pode', 'tem como',
  'me coloca', 'me manda', 'me passa', 'me transfere',
];

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function isRequestingHuman(text: string): boolean {
  const n = normalize(text);
  const hasHuman = HUMAN_WORDS.some((w) => n.includes(w));
  const hasAction = ACTION_WORDS.some((w) => n.includes(w));
  return hasHuman && hasAction;
}

const SUPPORT_PHRASES = [
  'ja sou cliente',
  'sou cliente',
  'sou seu cliente',
  'ja contratei',
  'contratei voces',
  'meu projeto',
  'projeto de voces',
  'projeto que voces',
  'sistema de voces',
  'sistema que voces',
  'app de voces',
  'aplicativo de voces',
  'suporte tecnico',
  'preciso de suporte',
  'quero suporte',
  'problema no projeto',
  'problema no sistema',
  'nao esta funcionando',
  'nao funciona',
  'deu erro',
  'esta com erro',
  'bug',
  'prazo do projeto',
  'entrega do projeto',
  'atraso no projeto',
];

function isSupportRequest(text: string): boolean {
  const n = normalize(text);
  return SUPPORT_PHRASES.some((phrase) => n.includes(normalize(phrase)));
}

@Processor('whatsapp')
export class WhatsappProcessor {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly contactsService: ContactsService,
    private readonly aiService: AiService,
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
    private readonly externalActionsService: ExternalActionsService,
    private readonly flowStepsService: FlowStepsService,
    private readonly flowsService: FlowsService,
    private readonly flowEngine: FlowEngineService,
    @InjectQueue('media') private readonly mediaQueue: Queue,
    @InjectRepository(BroadcastRecipient)
    private readonly recipientRepo: Repository<BroadcastRecipient>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(AutomationExecution)
    private readonly automationExecRepo: Repository<AutomationExecution>,
    @InjectRepository(Broadcast)
    private readonly broadcastRepo: Repository<Broadcast>,
    @InjectRepository(CampaignPrompt)
    private readonly campaignPromptRepo: Repository<CampaignPrompt>,
  ) {}

  @Process('inbound-message')
  async handleInboundMessage(job: Job) {
    const { message, whatsappNumber, companyId, whatsappName } = job.data;

    try {
      // Idempotência: a Meta pode reenviar o mesmo webhook várias vezes
      const alreadyProcessed = await this.messageRepo.findOne({
        where: { whatsappMessageId: message.id, companyId },
      });
      if (alreadyProcessed) {
        this.logger.log(`Mensagem ${message.id} já processada, ignorando retry`);
        return;
      }

      const fromPhone = message.from;
      const contact = await this.contactsService.findOrCreateByPhone(
        fromPhone,
        companyId,
        whatsappName,
      );

      const conversation = await this.conversationsService.findOrCreate(
        companyId,
        contact.id,
        whatsappNumber.id,
      );

      let content = '';
      let type = MessageType.TEXT;
      let transcription: string | null = null;
      let interactiveReplyId: string | null = null;

      if (message.type === 'text') {
        content = message.text?.body || '';
        type = MessageType.TEXT;
      } else if (message.type === 'button') {
        content = message.button?.text || '';
        type = MessageType.TEXT;
      } else if (message.type === 'interactive') {
        content =
          message.interactive?.button_reply?.title ||
          message.interactive?.list_reply?.title ||
          '';
        interactiveReplyId =
          message.interactive?.button_reply?.id ||
          message.interactive?.list_reply?.id ||
          null;
        type = MessageType.TEXT;
      } else if (message.type === 'image') {
        content = message.image?.caption || '[Imagem]';
        type = MessageType.IMAGE;
      } else if (message.type === 'audio') {
        content = '[Áudio]';
        type = MessageType.AUDIO;
        transcription = await this.transcribeWhatsappAudio(message, whatsappNumber);
      } else if (message.type === 'video') {
        content = message.video?.caption || '[Vídeo]';
        type = MessageType.VIDEO;
      } else if (message.type === 'document') {
        content = message.document?.filename || '[Documento]';
        type = MessageType.DOCUMENT;
      } else {
        content = `[${message.type}]`;
      }

      const savedMessage = await this.conversationsService.saveMessage({
        conversationId: conversation.id,
        companyId,
        direction: MessageDirection.INBOUND,
        type,
        content,
        whatsappMessageId: message.id,
        whatsappNumberId: whatsappNumber.id,
        status: MessageStatus.DELIVERED,
        metadata: { raw: message, ...(transcription ? { transcription } : {}) },
      });

      this.logger.log(`Mensagem inbound processada: ${message.id} de ${fromPhone}`);

      const MEDIA_TYPES = [MessageType.IMAGE, MessageType.AUDIO, MessageType.VIDEO, MessageType.DOCUMENT];
      if (MEDIA_TYPES.includes(type)) {
        await this.mediaQueue.add('upload-media', { messageId: savedMessage.id, companyId }, { attempts: 3, backoff: 5000 });
      }

      const isAudioWithTranscription = type === MessageType.AUDIO && !!transcription;
      const botContent = isAudioWithTranscription ? transcription! : content;

      // Classificar sentimento na primeira resposta de campanha
      const isTextLike = type === MessageType.TEXT || isAudioWithTranscription;
      if (conversation.campaignBroadcastId && isTextLike) {
        const recipient = await this.recipientRepo.findOne({
          where: { broadcastId: conversation.campaignBroadcastId, contactId: contact.id },
        });
        if (recipient && !recipient.respondedAt) {
          recipient.respondedAt = new Date();
          recipient.responseSentiment = await this.aiService.classifySentiment(botContent) as any;
          await this.recipientRepo.save(recipient);
        }

        // Aplicar tag por intenção detectada
        const broadcast = await this.broadcastRepo.findOne({
          where: { id: conversation.campaignBroadcastId },
        });

        if (broadcast?.intentRules?.length) {
          const lastOutbound = await this.messageRepo.findOne({
            where: { conversationId: conversation.id, direction: MessageDirection.OUTBOUND },
            order: { createdAt: 'DESC' },
          });
          const questionContext = lastOutbound?.content ?? broadcast.message ?? undefined;
          const intents = broadcast.intentRules.map((r) => r.intent);
          const matchedIdx = await this.aiService.classifyIntent(botContent, intents, questionContext);
          if (matchedIdx >= 0) {
            try {
              await this.conversationsService.addTag(
                conversation.id,
                companyId,
                broadcast.intentRules[matchedIdx].tagId,
              );
            } catch (e) {
              this.logger.warn(`Falha ao aplicar tag de intenção: ${e.message}`);
            }
          }
        }
      }

      if (type !== MessageType.TEXT && !isAudioWithTranscription) return;

      if (conversation.aiState === 'human_requested') return;

      if (conversation.aiState?.startsWith('flow:')) {
        const stepId = conversation.aiState.slice(5);
        let step = await this.flowStepsService.findById(companyId, stepId);
        if (!step) {
          await this.conversationsService.updateAiState(conversation.id, null);
          return;
        }

        // Defensivo: aiState só deveria apontar pra um bloco pausável (choice/text). Se não for,
        // resolve a cadeia de blocos automáticos antes de tentar casar a resposta contra opções.
        if (!this.flowEngine.isPausingBlock(step)) {
          const sink = this.whatsappService.createFlowSink(whatsappNumber, fromPhone, conversation.id, companyId);
          const outcome = await this.flowEngine.enterFlowStep(companyId, contact, conversation, sink, step);
          if ('fellThrough' in outcome) {
            await this.runAiTurn(conversation, contact, whatsappNumber, fromPhone, companyId, savedMessage.id, botContent, isAudioWithTranscription);
          }
          return;
        }

        let resolved: {
          value: string;
          label: string;
          nextStepId: string | null;
          endMessage: string | null;
          saveAsVariable: { name: string; scope: 'contact' | 'conversation' } | null;
          onAnswerActionName?: string | null;
        };

        if (step.stepType === FlowStepType.TEXT) {
          const cfg = step.config as TextConfig;
          resolved = {
            value: botContent,
            label: botContent,
            nextStepId: step.nextStepId,
            endMessage: cfg.endMessage,
            saveAsVariable: cfg.saveAsVariable,
            onAnswerActionName: cfg.onAnswerActionName,
          };
        } else {
          const cfg = step.config as ChoiceConfig;
          const normalizedContent = botContent.trim().toLowerCase();
          const matched = cfg.options.find(
            (o) =>
              (interactiveReplyId && o.value === interactiveReplyId) ||
              o.label.toLowerCase() === normalizedContent ||
              o.value.toLowerCase() === normalizedContent,
          );

          if (!matched) {
            await this.whatsappService.sendBotInteractive(
              whatsappNumber,
              fromPhone,
              `Não entendi. ${cfg.questionText}`,
              cfg.options,
              conversation.id,
              companyId,
            );
            return;
          }

          resolved = {
            value: matched.value,
            label: matched.label,
            nextStepId: matched.nextStepId,
            endMessage: matched.endMessage,
            saveAsVariable: matched.saveAsVariable,
            onAnswerActionName: cfg.onAnswerActionName,
          };
        }

        if (resolved.onAnswerActionName) {
          const action = (await this.externalActionsService.findActive(companyId)).find(
            (a) => a.name === resolved.onAnswerActionName,
          );
          if (action) {
            const outcome = await this.externalActionsService.execute(
              action,
              { valor: resolved.value, resposta: resolved.label },
              this.flowEngine.buildToolContext(contact, conversation),
            );
            await this.conversationsService.createEvent(conversation.id, ConversationEventType.EXTERNAL_ACTION_CALLED, {
              actionId: action.id,
              actionName: action.name,
              success: outcome.success,
              error: outcome.error,
              latencyMs: outcome.latencyMs,
            });
          }
        }

        if (resolved.saveAsVariable) {
          const { name: varName, scope } = resolved.saveAsVariable;
          if (scope === 'contact') {
            await this.contactsService.setMetadataField(contact.id, companyId, varName, resolved.value);
          } else {
            await this.conversationsService.setVariable(conversation.id, varName, resolved.value);
          }
        }

        const next = resolved.nextStepId ? await this.flowStepsService.findById(companyId, resolved.nextStepId) : null;
        if (next) {
          const sink = this.whatsappService.createFlowSink(whatsappNumber, fromPhone, conversation.id, companyId);
          const outcome = await this.flowEngine.enterFlowStep(companyId, contact, conversation, sink, next);
          if ('fellThrough' in outcome) {
            await this.runAiTurn(conversation, contact, whatsappNumber, fromPhone, companyId, savedMessage.id, botContent, isAudioWithTranscription);
          }
          return;
        }

        await this.conversationsService.updateAiState(conversation.id, null);

        if (resolved.endMessage) {
          await this.whatsappService.sendBotReply(whatsappNumber, fromPhone, resolved.endMessage, conversation.id, companyId);
          return;
        }

        // Sem próximo passo e sem mensagem de encerramento: devolve o controle pra IA imediatamente
        await this.runAiTurn(conversation, contact, whatsappNumber, fromPhone, companyId, savedMessage.id, botContent, isAudioWithTranscription);
        return;
      }

      const contactHasName = contact.name !== contact.phone;

      if (conversation.aiState === 'waiting_name') {
        const name = botContent.trim();
        await this.contactsService.update(contact.id, companyId, { name });
        await this.conversationsService.updateAiState(conversation.id, null);
        await this.whatsappService.sendBotReply(
          whatsappNumber,
          fromPhone,
          `Prazer, ${name}! Como posso te ajudar?`,
          conversation.id,
          companyId,
        );
      } else if (!contactHasName) {
        await this.conversationsService.updateAiState(conversation.id, 'waiting_name');
        await this.whatsappService.sendBotReply(
          whatsappNumber,
          fromPhone,
          'Olá! Para te atender melhor, qual é o seu nome?',
          conversation.id,
          companyId,
        );
      } else if (isSupportRequest(botContent)) {
        await this.conversationsService.updateAiState(conversation.id, 'human_requested');
        await this.whatsappService.sendBotReply(
          whatsappNumber,
          fromPhone,
          'Entendido! Vou chamar nossa equipe de suporte. Em breve um especialista entrará em contato com você. 👋',
          conversation.id,
          companyId,
        );
      } else if (isRequestingHuman(botContent)) {
        await this.conversationsService.updateAiState(conversation.id, 'human_requested');
        await this.whatsappService.sendBotReply(
          whatsappNumber,
          fromPhone,
          'Entendido! Um atendente entrará em contato em breve. 👋',
          conversation.id,
          companyId,
        );
      } else {
        await this.runAiTurn(conversation, contact, whatsappNumber, fromPhone, companyId, savedMessage.id, botContent, isAudioWithTranscription);
      }
    } catch (error) {
      this.logger.error(`Erro ao processar mensagem inbound: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async runAiTurn(
    conversation: any,
    contact: any,
    whatsappNumber: any,
    fromPhone: string,
    companyId: string,
    savedMessageId: string,
    botContent: string,
    isAudioWithTranscription: boolean,
  ): Promise<void> {
    const recentMessages = await this.conversationsService.getRecentMessages(conversation.id, whatsappNumber.botHistoryLimit ?? DEFAULT_BOT_HISTORY_LIMIT);
    const history = recentMessages.map((msg) => ({
      role: msg.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
      content: isAudioWithTranscription && msg.id === savedMessageId ? botContent : msg.content,
    }));
    const now = new Date();
    const campaignStillActive =
      conversation.campaignPrompt &&
      conversation.campaignExpiresAt &&
      conversation.campaignExpiresAt > now;
    const campaignExpiredNow =
      conversation.campaignPrompt &&
      conversation.campaignExpiresAt &&
      conversation.campaignExpiresAt <= now;

    if (campaignExpiredNow) {
      await this.conversationsService.createEvent(
        conversation.id,
        ConversationEventType.CAMPAIGN_EXPIRED,
        { expiredAt: conversation.campaignExpiresAt },
      );
    }

    const activeCampaignPrompt = campaignStillActive ? conversation.campaignPrompt : null;
    let aiPromptSource: string;
    if (activeCampaignPrompt) {
      aiPromptSource = 'campaign';
    } else if (whatsappNumber.systemPrompt) {
      aiPromptSource = 'system';
    } else {
      aiPromptSource = 'default';
    }

    let enabledToolNames = whatsappNumber.enabledToolNames as string[] | null;
    let enabledFlowNames = whatsappNumber.enabledFlowNames as string[] | null;
    if (activeCampaignPrompt && conversation.campaignBroadcastId) {
      const broadcast = await this.broadcastRepo.findOne({ where: { id: conversation.campaignBroadcastId } });
      const campaignPromptRecord = broadcast?.campaignPromptId
        ? await this.campaignPromptRepo.findOne({ where: { id: broadcast.campaignPromptId } })
        : null;
      if (campaignPromptRecord?.enabledToolNames?.length) enabledToolNames = campaignPromptRecord.enabledToolNames;
      if (campaignPromptRecord?.enabledFlowNames?.length) enabledFlowNames = campaignPromptRecord.enabledFlowNames;
    }

    const allActions = await this.externalActionsService.findActive(companyId);
    const actions = enabledToolNames?.length ? allActions.filter((a) => enabledToolNames!.includes(a.name)) : allActions;
    const tools = actions.map((a) => ({ name: a.name, description: a.description, parameters: a.parametersSchema }));

    const allFlows = await this.flowsService.findAll(companyId);
    const availableFlows = enabledFlowNames?.length ? allFlows.filter((f) => enabledFlowNames!.includes(f.name)) : allFlows;
    if (availableFlows.length) {
      tools.push({
        name: 'iniciar_fluxo',
        description: `Inicia um fluxo guiado de perguntas fixas. Fluxos disponíveis:\n${availableFlows.map((f) => `- ${f.name}: ${f.description}`).join('\n')}`,
        parameters: {
          type: 'object',
          properties: { nome: { type: 'string', enum: availableFlows.map((f) => f.name) } },
          required: ['nome'],
        },
      });
    }

    tools.push({
      name: 'salvar_variavel',
      description: 'Salva uma informação nova aprendida durante a conversa, pra usar depois em outras tools. Use escopo "contact" pra algo permanente sobre a pessoa (ex: nome da mãe), ou "conversation" pra algo que só vale nesse atendimento.',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome da variável, ex: nomeMae' },
          valor: { type: 'string' },
          escopo: { type: 'string', enum: ['contact', 'conversation'] },
        },
        required: ['nome', 'valor', 'escopo'],
      },
    });

    const executeTool = async (name: string, args: any) => {
      if (name === 'salvar_variavel') {
        if (!/^[a-z0-9_]+$/.test(args.nome ?? '')) {
          return { success: false, result: 'nome de variável inválido' };
        }
        if (args.escopo === 'contact') {
          await this.contactsService.setMetadataField(contact.id, companyId, args.nome, args.valor);
        } else {
          await this.conversationsService.setVariable(conversation.id, args.nome, args.valor);
        }
        return { success: true, result: 'variável salva' };
      }

      if (name === 'iniciar_fluxo') {
        const flow = availableFlows.find((f) => f.name === args.nome);
        if (!flow?.startStepId) return { success: false, result: 'fluxo não encontrado ou sem passo inicial definido' };
        const step = await this.flowStepsService.findById(companyId, flow.startStepId);
        if (!step) return { success: false, result: 'passo inicial não encontrado' };
        const sink = this.whatsappService.createFlowSink(whatsappNumber, fromPhone, conversation.id, companyId);
        const outcome = await this.flowEngine.enterFlowStep(companyId, contact, conversation, sink, step);
        if ('fellThrough' in outcome) {
          return { success: true, result: 'fluxo executado (só continha blocos automáticos) e encerrado imediatamente' };
        }
        return { success: true, result: 'fluxo iniciado' };
      }

      const action = actions.find((a) => a.name === name);
      if (!action) return { success: false, result: 'ação não encontrada' };
      const outcome = await this.externalActionsService.execute(action, args, this.flowEngine.buildToolContext(contact, conversation));
      await this.conversationsService.createEvent(conversation.id, ConversationEventType.EXTERNAL_ACTION_CALLED, {
        actionId: action.id,
        actionName: action.name,
        success: outcome.success,
        error: outcome.error,
        latencyMs: outcome.latencyMs,
      });
      return { success: outcome.success, result: outcome.responseData ?? outcome.error };
    };

    const reply = await this.aiService.chat(
      contact.name,
      history,
      activeCampaignPrompt ?? whatsappNumber.systemPrompt,
      tools.length ? { tools, executeTool } : undefined,
    );
    await this.whatsappService.sendBotReply(
      whatsappNumber,
      fromPhone,
      reply,
      conversation.id,
      companyId,
      aiPromptSource,
    );
  }

  @Process('status-update')
  async handleStatusUpdate(job: Job) {
    const { status, whatsappNumber } = job.data;

    try {
      const messageStatus = status.status as MessageStatus;
      const validStatuses = [MessageStatus.DELIVERED, MessageStatus.READ, MessageStatus.FAILED];

      if (!validStatuses.includes(messageStatus)) return;

      const updatedMessage = await this.conversationsService.updateMessageStatus(
        status.id,
        messageStatus,
        parseInt(status.timestamp, 10),
      );

      this.logger.log(`Status atualizado: ${status.id} -> ${status.status}`);

      if (messageStatus === MessageStatus.FAILED) {
        const metaError = status.errors?.[0];
        const errorMsg = metaError
          ? `[${metaError.code}] ${metaError.error_data?.details ?? metaError.title ?? metaError.message ?? 'Falha na entrega'}`
          : 'Falha na entrega (Meta)';

        // Marca recipient do broadcast como failed para aparecer na página de falhas
        const recipientId = updatedMessage?.metadata?.broadcastRecipientId;
        if (recipientId) {
          await this.recipientRepo.update(
            { id: recipientId },
            { status: RecipientStatus.FAILED, error: errorMsg },
          );
        }

        // Atualiza automação execution com o erro de entrega do WhatsApp
        if (updatedMessage?.conversationId) {
          await this.automationExecRepo.update(
            { conversationId: updatedMessage.conversationId, status: AutomationExecutionStatus.SENT },
            { status: AutomationExecutionStatus.FAILED, error: errorMsg },
          );
        }

        // Retry com número alternativo (12 ↔ 13 dígitos)
        if (whatsappNumber) {
          await this.retryWithAlternativePhone(status.id, whatsappNumber);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao processar status update: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async transcribeWhatsappAudio(message: any, whatsappNumber: any): Promise<string | null> {
    try {
      const mediaId = message.audio?.id;
      if (!mediaId) return null;

      const accessToken = decrypt(whatsappNumber.accessToken, this.configService);
      const apiUrl = this.configService.get<string>('WHATSAPP_API_URL');

      const metaRes = await axios.get(`${apiUrl}/${mediaId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const { url, mime_type } = metaRes.data;

      const audioRes = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: 'arraybuffer',
      });

      const buffer = Buffer.from(audioRes.data);
      return await this.aiService.transcribeAudio(buffer, mime_type || 'audio/ogg');
    } catch (err: any) {
      this.logger.warn(`Falha ao transcrever áudio: ${err.message}`);
      return null;
    }
  }

  private async retryWithAlternativePhone(
    whatsappMessageId: string,
    whatsappNumber: any,
  ): Promise<void> {
    const message = await this.messageRepo.findOne({
      where: { whatsappMessageId },
      relations: ['conversation', 'conversation.contact'],
    });

    if (!message || message.direction !== MessageDirection.OUTBOUND) return;
    if (message.type !== MessageType.TEXT) return;
    if (message.metadata?.isRetry) return; // evita loop infinito de retries

    const contact = message.conversation?.contact;
    if (!contact) return;

    const alt = phoneAlternative(contact.phone);
    if (!alt) return;

    this.logger.warn(
      `Mensagem ${whatsappMessageId} falhou para ${contact.phone}, tentando alternativo ${alt}`,
    );

    try {
      // Usa sendBotReply para reutilizar a conversa existente — sendMessage criaria novo contato/conversa
      const fullNumber = await this.whatsappService.findById(whatsappNumber.id, whatsappNumber.companyId);
      await this.whatsappService.sendBotReply(
        fullNumber,
        alt,
        message.content,
        message.conversationId,
        message.companyId,
        undefined,
        { isRetry: true, originalMessageId: whatsappMessageId },
      );

      await this.contactsService.updatePhone(contact.id, contact.companyId, alt);
      this.logger.log(`Retry bem-sucedido: contato ${contact.id} atualizado para ${alt}`);
    } catch (err) {
      this.logger.warn(`Retry também falhou para ${alt}: ${err.message}`);
    }
  }

}
