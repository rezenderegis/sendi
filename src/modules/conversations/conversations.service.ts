import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from './conversation.entity';
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
  ) {}

  async findAll(
    companyId: string,
    page = 1,
    limit = 20,
    tagId?: string,
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

    if (!conversation) {
      conversation = this.conversationRepository.create({
        companyId,
        contactId,
        whatsappNumberId,
        status: ConversationStatus.OPEN,
        lastMessageAt: new Date(),
      });
      conversation = await this.conversationRepository.save(conversation);
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

  async updateMessageStatus(
    whatsappMessageId: string,
    status: MessageStatus,
    timestamp: number,
  ): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { whatsappMessageId },
    });
    if (!message) return;

    const date = new Date(timestamp * 1000);
    message.status = status;

    if (status === MessageStatus.DELIVERED) {
      message.deliveredAt = date;
    } else if (status === MessageStatus.READ) {
      message.readAt = date;
    }

    await this.messageRepository.save(message);
  }
}
