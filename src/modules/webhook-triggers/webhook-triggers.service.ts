import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WhatsappNumber } from '../whatsapp/whatsapp-number.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ContactsService } from '../contacts/contacts.service';
import { ConversationsService } from '../conversations/conversations.service';
import { FlowsService } from '../flow-steps/flows.service';
import { FlowStepsService } from '../flow-steps/flow-steps.service';
import { FlowEngineService } from '../flow-steps/flow-engine.service';
import { CampaignPrompt } from '../campaign-prompts/campaign-prompt.entity';
import { WebhookTriggerEvent, WebhookTriggerStatus } from './webhook-trigger-event.entity';
import { decrypt } from '../../common/utils/crypto.util';
import { TriggerWebhookDto } from './dto/trigger-webhook.dto';

const CAMPAIGN_CONTEXT_HOURS = 72;

@Injectable()
export class WebhookTriggersService {
  constructor(
    @InjectRepository(WhatsappNumber)
    private readonly numberRepo: Repository<WhatsappNumber>,
    @InjectRepository(CampaignPrompt)
    private readonly promptRepo: Repository<CampaignPrompt>,
    @InjectRepository(WebhookTriggerEvent)
    private readonly eventRepo: Repository<WebhookTriggerEvent>,
    private readonly whatsappService: WhatsappService,
    private readonly contactsService: ContactsService,
    private readonly conversationsService: ConversationsService,
    private readonly flowsService: FlowsService,
    private readonly flowStepsService: FlowStepsService,
    private readonly flowEngine: FlowEngineService,
    private readonly configService: ConfigService,
  ) {}

  async trigger(whatsappNumberId: string, bearerSecret: string | undefined, dto: TriggerWebhookDto) {
    const number = await this.numberRepo
      .createQueryBuilder('n')
      .addSelect('n.triggerWebhookSecret')
      .where('n.id = :id', { id: whatsappNumberId })
      .getOne();
    if (!number || !number.triggerWebhookSecret) {
      throw new NotFoundException('Webhook de disparo não configurado pra esse número');
    }

    const secret = decrypt(number.triggerWebhookSecret, this.configService);
    if (!bearerSecret || bearerSecret !== secret) {
      throw new UnauthorizedException('Secret inválido');
    }

    if (!dto.promptName && !dto.flowName) {
      throw new BadRequestException('Informe promptName e/ou flowName');
    }
    const hasOpening = !!dto.mensagem || !!dto.template;
    if (dto.promptName && !dto.flowName && !hasOpening) {
      throw new BadRequestException('mensagem ou template é obrigatório quando só promptName é informado (sem flowName, nada mais dispararia o envio)');
    }

    const companyId = number.companyId;

    if (dto.idempotencyKey) {
      const existing = await this.eventRepo.findOne({ where: { whatsappNumberId, idempotencyKey: dto.idempotencyKey } });
      if (existing) {
        if (existing.status === WebhookTriggerStatus.SUCCESS) {
          return { success: true, deduped: true };
        }
        // tentativa anterior falhou: permite retry, remove o registro antigo pra não colidir com o índice único
        await this.eventRepo.delete(existing.id);
      }
    }

    let promptRecord: CampaignPrompt | null = null;
    if (dto.promptName) {
      promptRecord = await this.promptRepo.findOne({ where: { name: dto.promptName, companyId } });
      if (!promptRecord) throw new BadRequestException(`Prompt "${dto.promptName}" não encontrado`);
    }

    let startStep: Awaited<ReturnType<typeof this.flowStepsService.findById>> = null;
    if (dto.flowName) {
      const flows = await this.flowsService.findAll(companyId);
      const flow = flows.find((f) => f.name === dto.flowName);
      if (!flow?.startStepId) throw new BadRequestException(`Fluxo "${dto.flowName}" não encontrado ou sem passo inicial definido`);
      startStep = await this.flowStepsService.findById(companyId, flow.startStepId);
      if (!startStep) throw new BadRequestException('Passo inicial do fluxo não encontrado');
    }

    try {
      let contact = await this.contactsService.findOrCreateByPhone(dto.phone, companyId);
      if (dto.variables && Object.keys(dto.variables).length) {
        await this.contactsService.setMetadataFields(contact.id, companyId, dto.variables);
        contact = { ...contact, metadata: { ...(contact.metadata ?? {}), ...dto.variables } } as any;
      }

      const campaignExpiresAt = promptRecord ? new Date(Date.now() + CAMPAIGN_CONTEXT_HOURS * 3600 * 1000) : undefined;
      let conversation: any;

      if (hasOpening) {
        const mensagemResolvida = dto.mensagem
          ? this.flowEngine.resolveTemplate(dto.mensagem, this.flowEngine.buildToolContext(contact, { id: null, variables: null }))
          : undefined;
        await this.whatsappService.sendMessage(companyId, {
          to: dto.phone,
          whatsappNumberId,
          type: dto.template ? 'template' : 'text',
          message: mensagemResolvida,
          templateName: dto.template?.name,
          templateLanguage: dto.template?.language,
          templateVariables: dto.template?.variables,
          campaignPrompt: promptRecord?.content,
          campaignExpiresAt,
        } as any);
        conversation = await this.conversationsService.findOrCreate(companyId, contact.id, whatsappNumberId);
      } else {
        conversation = await this.conversationsService.findOrCreate(companyId, contact.id, whatsappNumberId);
        if (promptRecord) {
          await this.conversationsService.setCampaignContext(conversation.id, promptRecord.content, null, campaignExpiresAt!);
        }
      }

      if (startStep) {
        const sink = this.whatsappService.createFlowSink(number, dto.phone, conversation.id, companyId);
        await this.flowEngine.enterFlowStep(companyId, contact, conversation, sink, startStep);
      }

      await this.eventRepo.save(
        this.eventRepo.create({
          whatsappNumberId,
          companyId,
          phone: dto.phone,
          promptName: dto.promptName ?? null,
          flowName: dto.flowName ?? null,
          idempotencyKey: dto.idempotencyKey ?? null,
          status: WebhookTriggerStatus.SUCCESS,
        }),
      );

      return { success: true, contactId: contact.id, conversationId: conversation.id };
    } catch (err: any) {
      await this.eventRepo.save(
        this.eventRepo.create({
          whatsappNumberId,
          companyId,
          phone: dto.phone,
          promptName: dto.promptName ?? null,
          flowName: dto.flowName ?? null,
          idempotencyKey: dto.idempotencyKey ?? null,
          status: WebhookTriggerStatus.ERROR,
          errorMessage: err.message,
        }),
      );
      throw err;
    }
  }
}
