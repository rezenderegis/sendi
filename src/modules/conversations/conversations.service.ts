import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from './conversation.entity';
import { ConversationEvent, ConversationEventType } from './conversation-event.entity';
import { Message, MessageDirection, MessageStatus, MessageType } from './message.entity';
import { Tag } from '../tags/tag.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(ConversationEvent)
    private readonly eventRepository: Repository<ConversationEvent>,
  ) {}

  async createEvent(
    conversationId: string,
    type: ConversationEventType,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.eventRepository.save(
      this.eventRepository.create({ conversationId, type, metadata: metadata ?? null }),
    );
  }

  async getEvents(id: string, companyId: string): Promise<ConversationEvent[]> {
    await this.findById(id, companyId);
    return this.eventRepository.find({
      where: { conversationId: id },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(
    companyId: string,
    page = 1,
    limit = 20,
    tagId?: string,
    allowedNumberIds?: string[] | null,
  ): Promise<{ data: Conversation[]; total: number; page: number; limit: number }> {
    const qb = this.conversationRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.contact', 'contact')
      .leftJoinAndSelect('c.whatsappNumber', 'whatsappNumber')
      .leftJoinAndSelect('c.assignedUser', 'assignedUser')
      .leftJoinAndSelect('c.tags', 'tags')
      .where('c.companyId = :companyId', { companyId })
      .orderBy('c.lastMessageAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (tagId) {
      qb.innerJoin('c.tags', 'filterTag', 'filterTag.id = :tagId', { tagId });
    }

    if (allowedNumberIds?.length) {
      qb.andWhere('c.whatsappNumberId IN (:...allowedNumberIds)', { allowedNumberIds });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findById(id: string, companyId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, companyId },
      relations: ['contact', 'whatsappNumber', 'assignedUser', 'tags'],
    });
    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }
    return conversation;
  }

  async findMessages(
    conversationId: string,
    companyId: string,
    page = 1,
    limit = 50,
  ) {
    await this.findById(conversationId, companyId);

    const [data, total] = await this.messageRepository.findAndCount({
      where: { conversationId, companyId },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async updateStatus(
    id: string,
    companyId: string,
    status: ConversationStatus,
    assignedUserId?: string,
  ): Promise<Conversation> {
    const conversation = await this.findById(id, companyId);
    conversation.status = status;
    if (assignedUserId !== undefined) {
      conversation.assignedUserId = assignedUserId;
    }
    return this.conversationRepository.save(conversation);
  }

  async addTag(conversationId: string, companyId: string, tagId: string): Promise<void> {
    await this.findById(conversationId, companyId);

    const tag = await this.tagRepository.findOne({ where: { id: tagId, companyId } });
    if (!tag) {
      throw new NotFoundException('Tag não encontrada');
    }

    await this.conversationRepository
      .createQueryBuilder()
      .relation(Conversation, 'tags')
      .of(conversationId)
      .add(tagId);
  }

  async removeTag(conversationId: string, companyId: string, tagId: string): Promise<void> {
    await this.findById(conversationId, companyId);

    await this.conversationRepository
      .createQueryBuilder()
      .relation(Conversation, 'tags')
      .of(conversationId)
      .remove(tagId);
  }

  async findOrCreate(
    companyId: string,
    contactId: string,
    whatsappNumberId: string,
  ): Promise<Conversation> {
    let conversation = await this.conversationRepository.findOne({
      where: {
        companyId,
        contactId,
        whatsappNumberId,
        status: ConversationStatus.OPEN,
      },
    });

    const now = new Date();

    const hasActiveCampaign = (c: Conversation) =>
      !!(c.campaignPrompt && c.campaignExpiresAt && c.campaignExpiresAt > now);

    const findActiveCampaignElsewhere = () =>
      this.conversationRepository
        .createQueryBuilder('c')
        .where('c.companyId = :companyId', { companyId })
        .andWhere('c.contactId = :contactId', { contactId })
        .andWhere('c.campaignPrompt IS NOT NULL')
        .andWhere('c.campaignExpiresAt > :now', { now })
        .andWhere('c.status = :status', { status: ConversationStatus.OPEN })
        .orderBy('c.campaignExpiresAt', 'DESC')
        .getOne();

    if (!conversation) {
      // Se o contato respondeu em outro número mas tem campanha ativa lá, herda o contexto
      const campaignSource = await findActiveCampaignElsewhere();

      conversation = this.conversationRepository.create({
        companyId,
        contactId,
        whatsappNumberId,
        status: ConversationStatus.OPEN,
        lastMessageAt: new Date(),
        ...(campaignSource ? {
          campaignPrompt: campaignSource.campaignPrompt,
          campaignBroadcastId: campaignSource.campaignBroadcastId,
          campaignExpiresAt: campaignSource.campaignExpiresAt,
        } : {}),
      });
      conversation = await this.conversationRepository.save(conversation);
    } else if (!hasActiveCampaign(conversation)) {
      // Conversa existe mas sem campanha ativa — verifica se há campanha em outro número
      const campaignSource = await findActiveCampaignElsewhere();
      if (campaignSource) {
        const patch = {
          campaignPrompt: campaignSource.campaignPrompt,
          campaignBroadcastId: campaignSource.campaignBroadcastId,
          campaignExpiresAt: campaignSource.campaignExpiresAt,
        };
        await this.conversationRepository.update(conversation.id, patch);
        Object.assign(conversation, patch);
      }
    }

    return conversation;
  }

  async saveMessage(data: {
    conversationId: string;
    companyId: string;
    direction: MessageDirection;
    type: MessageType;
    content: string;
    whatsappMessageId?: string;
    status?: MessageStatus;
    metadata?: Record<string, any>;
    aiPromptSource?: string;
  }): Promise<Message> {
    const message = this.messageRepository.create({
      ...data,
      sentAt: new Date(),
      status: data.status || MessageStatus.SENT,
    });
    const saved = await this.messageRepository.save(message);

    await this.conversationRepository.update(data.conversationId, {
      lastMessageAt: new Date(),
    });

    return saved;
  }

  async updateAiState(conversationId: string, state: string | null): Promise<void> {
    await this.conversationRepository.update(conversationId, { aiState: state });
  }

  async getRecentMessages(conversationId: string, limit = 10): Promise<Message[]> {
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return messages.reverse();
  }

  async enableBot(id: string, companyId: string): Promise<void> {
    await this.findById(id, companyId);
    await this.conversationRepository.update(id, { aiState: null });
  }

  async disableBot(id: string, companyId: string): Promise<void> {
    await this.findById(id, companyId);
    await this.conversationRepository.update(id, { aiState: 'human_requested' });
  }

  async setCampaignContext(
    id: string,
    campaignPrompt: string,
    campaignBroadcastId: string | null,
    campaignExpiresAt: Date,
  ): Promise<void> {
    await this.conversationRepository.update(id, {
      campaignPrompt,
      campaignBroadcastId,
      campaignExpiresAt,
    });
  }

  async resetCampaignContext(
    id: string,
    companyId: string,
    eventType = ConversationEventType.CAMPAIGN_RESET_MANUAL,
  ): Promise<void> {
    await this.findById(id, companyId);
    await this.conversationRepository.update(id, {
      campaignPrompt: null,
      campaignBroadcastId: null,
      campaignExpiresAt: null,
    });
    await this.createEvent(id, eventType);
  }

  async updateMessageStatus(
    whatsappMessageId: string,
    status: MessageStatus,
    timestamp: number,
  ): Promise<Message | null> {
    const message = await this.messageRepository.findOne({
      where: { whatsappMessageId },
    });
    if (!message) return null;

    const date = new Date(timestamp * 1000);
    message.status = status;

    if (status === MessageStatus.DELIVERED) {
      message.deliveredAt = date;
    } else if (status === MessageStatus.READ) {
      message.readAt = date;
    }

    return this.messageRepository.save(message);
  }
}
