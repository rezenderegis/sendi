import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ConversationsService } from '../conversations/conversations.service';
import { ContactsService } from '../contacts/contacts.service';
import { AiService } from '../ai/ai.service';
import { WhatsappService } from './whatsapp.service';
import { MessageDirection, MessageStatus, MessageType } from '../conversations/message.entity';

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

function isRequestingHuman(text: string): boolean {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hasHuman = HUMAN_WORDS.some((w) => normalized.includes(w));
  const hasAction = ACTION_WORDS.some((w) => normalized.includes(w));
  return hasHuman && hasAction;
}

@Processor('whatsapp')
export class WhatsappProcessor {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly contactsService: ContactsService,
    private readonly aiService: AiService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Process('inbound-message')
  async handleInboundMessage(job: Job) {
    const { message, whatsappNumber, companyId, whatsappName } = job.data;

    try {
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

      if (message.type === 'text') {
        content = message.text?.body || '';
        type = MessageType.TEXT;
      } else if (message.type === 'image') {
        content = message.image?.caption || '[Imagem]';
        type = MessageType.IMAGE;
      } else if (message.type === 'audio') {
        content = '[Áudio]';
        type = MessageType.AUDIO;
      } else if (message.type === 'video') {
        content = message.video?.caption || '[Vídeo]';
        type = MessageType.VIDEO;
      } else if (message.type === 'document') {
        content = message.document?.filename || '[Documento]';
        type = MessageType.DOCUMENT;
      } else {
        content = `[${message.type}]`;
      }

      await this.conversationsService.saveMessage({
        conversationId: conversation.id,
        companyId,
        direction: MessageDirection.INBOUND,
        type,
        content,
        whatsappMessageId: message.id,
        status: MessageStatus.DELIVERED,
        metadata: { raw: message },
      });

      this.logger.log(`Mensagem inbound processada: ${message.id} de ${fromPhone}`);

      if (message.type !== 'text') return;

      if (conversation.aiState === 'human_requested') return;

      const contactHasName = contact.name !== contact.phone;

      if (conversation.aiState === 'waiting_name') {
        const name = content.trim();
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
      } else if (isRequestingHuman(content)) {
        await this.conversationsService.updateAiState(conversation.id, 'human_requested');
        await this.whatsappService.sendBotReply(
          whatsappNumber,
          fromPhone,
          'Entendido! Um atendente entrará em contato em breve. 👋',
          conversation.id,
          companyId,
        );
      } else {
        const recentMessages = await this.conversationsService.getRecentMessages(conversation.id, 10);
        const history = recentMessages.map((msg) => ({
          role: msg.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
          content: msg.content,
        }));
        const reply = await this.aiService.chat(contact.name, history, whatsappNumber.systemPrompt);
        await this.whatsappService.sendBotReply(
          whatsappNumber,
          fromPhone,
          reply,
          conversation.id,
          companyId,
        );
      }
    } catch (error) {
      this.logger.error(`Erro ao processar mensagem inbound: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('status-update')
  async handleStatusUpdate(job: Job) {
    const { status } = job.data;

    try {
      const messageStatus = status.status as MessageStatus;
      const validStatuses = [MessageStatus.DELIVERED, MessageStatus.READ, MessageStatus.FAILED];

      if (!validStatuses.includes(messageStatus)) return;

      await this.conversationsService.updateMessageStatus(
        status.id,
        messageStatus,
        parseInt(status.timestamp, 10),
      );

      this.logger.log(`Status atualizado: ${status.id} -> ${status.status}`);
    } catch (error) {
      this.logger.error(`Erro ao processar status update: ${error.message}`, error.stack);
      throw error;
    }
  }
}
