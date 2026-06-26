import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ConversationsService } from '../conversations/conversations.service';
import { ContactsService } from '../contacts/contacts.service';
import { MessageDirection, MessageStatus, MessageType } from '../conversations/message.entity';

@Processor('whatsapp')
export class WhatsappProcessor {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly contactsService: ContactsService,
  ) {}

  @Process('inbound-message')
  async handleInboundMessage(job: Job) {
    const { message, whatsappNumber, companyId } = job.data;

    try {
      const fromPhone = message.from;
      const contact = await this.contactsService.findOrCreateByPhone(
        fromPhone,
        companyId,
        fromPhone,
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

      this.logger.log(
        `Mensagem inbound processada: ${message.id} de ${fromPhone}`,
      );
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
