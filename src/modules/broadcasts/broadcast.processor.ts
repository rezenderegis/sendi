import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { Broadcast, BroadcastStatus, BroadcastType } from './broadcast.entity';
import { BroadcastRecipient, RecipientStatus } from './broadcast-recipient.entity';
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
      const hasName = !!(recipient.contact.name && recipient.contact.name !== recipient.contact.phone);
      const fullName = hasName ? recipient.contact.name : null;
      const firstName = hasName ? recipient.contact.name.split(' ')[0] : null;

      // CSV mode: usa mensagem/variáveis do recipient; standard: usa template do broadcast
      const messageText = (recipient.customMessage ?? broadcast.message)
        ?.replace(/,?\s*\{\{nome\}\}/gi, fullName ?? '')
        ?.replace(/,?\s*\{\{primeiro_nome\}\}/gi, firstName ?? '')
        ?.trim();

      const campaignExpiresAt = broadcast.campaignPrompt ? (() => {
        const d = new Date();
        d.setHours(d.getHours() + CAMPAIGN_CONTEXT_HOURS);
        return d;
      })() : undefined;

      const { conversationId } = await this.whatsappService.sendMessage(broadcast.companyId, {
        whatsappNumberId: broadcast.whatsappNumberId,
        to: recipient.contact.phone,
        type: broadcast.type === BroadcastType.TEMPLATE ? 'template' : 'text',
        message: messageText,
        templateName: broadcast.templateName ?? undefined,
        templateLanguage: broadcast.templateLanguage ?? undefined,
        templateVariables: recipient.templateVariables ?? undefined,
        campaignPrompt: broadcast.campaignPrompt ?? undefined,
        campaignBroadcastId: broadcast.id,
        campaignExpiresAt,
        broadcastRecipientId: recipient.id,
      });

      recipient.status = RecipientStatus.SENT;
      recipient.sentAt = new Date();
      broadcast.sentCount++;

      if (broadcast.campaignPrompt && conversationId) {
        await this.eventRepo.save(
          this.eventRepo.create({
            conversationId,
            type: ConversationEventType.CAMPAIGN_ACTIVATED,
            metadata: {
              broadcastId: broadcast.id,
              broadcastName: broadcast.name,
              promptPreview: broadcast.campaignPrompt.slice(0, 120),
              expiresAt: campaignExpiresAt,
            },
          }),
        );
      }
    } catch (err) {
      recipient.status = RecipientStatus.FAILED;
      recipient.error = err?.response?.data?.error?.message || err?.message || 'Erro desconhecido';
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
