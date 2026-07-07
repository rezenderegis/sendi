import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { Broadcast, BroadcastStatus, BroadcastType } from './broadcast.entity';
import { BroadcastRecipient, RecipientStatus } from './broadcast-recipient.entity';
import { Conversation, ConversationStatus } from '../conversations/conversation.entity';
import { ConversationEvent, ConversationEventType } from '../conversations/conversation-event.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';

const CAMPAIGN_CONTEXT_HOURS = 72;

@Processor('broadcast')
export class BroadcastProcessor {
  private readonly logger = new Logger(BroadcastProcessor.name);

  constructor(
    @InjectRepository(Broadcast)
    private readonly broadcastRepo: Repository<Broadcast>,
    @InjectRepository(BroadcastRecipient)
    private readonly recipientRepo: Repository<BroadcastRecipient>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationEvent)
    private readonly eventRepo: Repository<ConversationEvent>,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Process('send-message')
  async handleSendMessage(job: Job<{ broadcastId: string; recipientId: string }>) {
    const { broadcastId, recipientId } = job.data;

    const broadcast = await this.broadcastRepo.findOne({ where: { id: broadcastId } });
    if (!broadcast) return;

    if (broadcast.status === BroadcastStatus.PAUSED) return;

    const recipient = await this.recipientRepo.findOne({
      where: { id: recipientId },
      relations: ['contact'],
    });
    if (!recipient || recipient.status !== RecipientStatus.PENDING) return;

    if (broadcast.status === BroadcastStatus.QUEUED) {
      broadcast.status = BroadcastStatus.SENDING;
      broadcast.startedAt = broadcast.startedAt || new Date();
      await this.broadcastRepo.save(broadcast);
    }

    try {
      const contactName = recipient.contact.name || recipient.contact.phone;
      const firstName = contactName.split(' ')[0];
      const personalizedMessage = broadcast.message
        ? broadcast.message
            .replace(/\{\{nome\}\}/gi, contactName)
            .replace(/\{\{primeiro_nome\}\}/gi, firstName)
        : undefined;

      await this.whatsappService.sendMessage(broadcast.companyId, {
        whatsappNumberId: broadcast.whatsappNumberId,
        to: recipient.contact.phone,
        type: broadcast.type === BroadcastType.TEMPLATE ? 'template' : 'text',
        message: personalizedMessage,
        templateName: broadcast.templateName ?? undefined,
        templateLanguage: broadcast.templateLanguage ?? undefined,
      });

      recipient.status = RecipientStatus.SENT;
      recipient.sentAt = new Date();
      broadcast.sentCount++;

      // Grava contexto de campanha na conversa se o broadcast tiver campaignPrompt
      if (broadcast.campaignPrompt) {
        // Busca conversa ABERTA — mesma lógica do findOrCreate do whatsapp processor
        let conversation = await this.conversationRepo.findOne({
          where: {
            companyId: broadcast.companyId,
            whatsappNumberId: broadcast.whatsappNumberId,
            contactId: recipient.contactId,
            status: ConversationStatus.OPEN,
          },
        });

        // Se não existe conversa aberta, cria uma para que o contexto já esteja pronto quando o cliente responder
        if (!conversation) {
          conversation = await this.conversationRepo.save(
            this.conversationRepo.create({
              companyId: broadcast.companyId,
              whatsappNumberId: broadcast.whatsappNumberId,
              contactId: recipient.contactId,
              status: ConversationStatus.OPEN,
              lastMessageAt: new Date(),
            }),
          );
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + CAMPAIGN_CONTEXT_HOURS);
        conversation.campaignPrompt = broadcast.campaignPrompt;
        conversation.campaignBroadcastId = broadcast.id;
        conversation.campaignExpiresAt = expiresAt;
        await this.conversationRepo.save(conversation);

        await this.eventRepo.save(
          this.eventRepo.create({
            conversationId: conversation.id,
            type: ConversationEventType.CAMPAIGN_ACTIVATED,
            metadata: {
              broadcastId: broadcast.id,
              broadcastName: broadcast.name,
              promptPreview: broadcast.campaignPrompt.slice(0, 120),
              expiresAt,
            },
          }),
        );
      }
    } catch (err) {
      recipient.status = RecipientStatus.FAILED;
      recipient.error = err?.message || 'Erro desconhecido';
      broadcast.failedCount++;
      this.logger.warn(`Falha ao enviar para ${recipient.contact.phone}: ${recipient.error}`);
    }

    await this.recipientRepo.save(recipient);

    if (broadcast.sentCount + broadcast.failedCount >= broadcast.totalCount) {
      broadcast.status = BroadcastStatus.COMPLETED;
      broadcast.completedAt = new Date();
    }

    await this.broadcastRepo.save(broadcast);
  }
}
