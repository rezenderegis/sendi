import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowOnsService } from './follow-ons.service';
import { FollowOnType } from './follow-on.entity';
import { Conversation } from '../conversations/conversation.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { User } from '../users/user.entity';

@Injectable()
export class FollowOnsCronService {
  private readonly logger = new Logger(FollowOnsCronService.name);

  constructor(
    private readonly followOnsService: FollowOnsService,
    private readonly whatsappService: WhatsappService,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Cron('* * * * *') // todo minuto
  async processPending() {
    const pending = await this.followOnsService.findPendingDue();
    if (!pending.length) return;

    this.logger.log(`Processando ${pending.length} follow-on(s) pendente(s)`);

    for (const fo of pending) {
      try {
        const typeLabels: Record<string, string> = {
          meeting: 'Reunião',
          call: 'Ligação',
          message: 'Mensagem enviada',
        };

        if (fo.type === FollowOnType.MESSAGE) {
          const conv = await this.conversationRepo.findOne({
            where: { id: fo.conversationId },
            relations: ['contact', 'whatsappNumber'],
          });

          if (conv?.contact && conv.whatsappNumber) {
            if (fo.templateName) {
              await this.whatsappService.sendMessage(fo.companyId, {
                whatsappNumberId: conv.whatsappNumberId,
                to: conv.contact.phone,
                type: 'template',
                templateName: fo.templateName,
                templateLanguage: fo.templateLanguage ?? 'pt_BR',
                templateVariables: fo.templateVariables ?? undefined,
              });
            } else if (fo.message) {
              await this.whatsappService.sendMessage(fo.companyId, {
                whatsappNumberId: conv.whatsappNumberId,
                to: conv.contact.phone,
                type: 'text',
                message: fo.message,
              });
            }
          }
        }

        await this.followOnsService.markDone(fo.id);

        // Notificar atendente responsável
        const targetUserId = fo.assignedUserId;
        if (targetUserId) {
          const conv = await this.conversationRepo.findOne({
            where: { id: fo.conversationId },
            relations: ['contact'],
          });
          const contactName = conv?.contact?.name ?? 'Contato';
          const label = typeLabels[fo.type] ?? fo.type;
          await this.followOnsService.createNotification({
            companyId: fo.companyId,
            userId: targetUserId,
            title: `Follow-on: ${label}`,
            body: fo.note ? `${contactName} · ${fo.note}` : contactName,
            conversationId: fo.conversationId,
            followOnId: fo.id,
          });
        }
      } catch (err) {
        this.logger.error(`Erro ao processar follow-on ${fo.id}: ${err.message}`);
      }
    }
  }
}
