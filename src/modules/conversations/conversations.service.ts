import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Conversation, ConversationStatus } from './conversation.entity';
import { ConversationEvent, ConversationEventType } from './conversation-event.entity';
import { Message, MessageDirection, MessageStatus, MessageType } from './message.entity';
import { Tag } from '../tags/tag.entity';
import { User } from '../users/user.entity';
import { AppNotification } from '../follow-ons/notification.entity';
import { TransferConversationDto } from './dto/transfer-conversation.dto';
import { DepartmentsService } from '../departments/departments.service';

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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AppNotification)
    private readonly notificationRepository: Repository<AppNotification>,
    private readonly departmentsService: DepartmentsService,
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
    waitingReply?: boolean,
    waitingCustomerReply?: boolean,
    search?: string,
    departmentId?: string,
    unassigned?: boolean,
    assignedUserId?: string,
  ): Promise<{ data: Conversation[]; total: number; page: number; limit: number }> {
    const qb = this.conversationRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.contact', 'contact')
      .leftJoinAndSelect('c.whatsappNumber', 'whatsappNumber')
      .leftJoinAndSelect('c.assignedUser', 'assignedUser')
      .leftJoinAndSelect('c.department', 'department')
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

    if (waitingReply === true) {
      qb.andWhere('c.waitingReply = true');
    }

    if (waitingCustomerReply === true) {
      qb.andWhere('c.waitingReply = false')
        .andWhere('c.lastMessageAt IS NOT NULL')
        .andWhere('c.status = :open', { open: 'open' });
    }

    if (search) {
      qb.andWhere('(contact.name ILIKE :search OR contact.phone ILIKE :search)', { search: `%${search}%` });
    }

    if (departmentId) {
      qb.andWhere('c.departmentId = :departmentId', { departmentId });
    }

    if (unassigned === true) {
      qb.andWhere('c.assignedUserId IS NULL');
    }

    if (assignedUserId) {
      qb.andWhere('c.assignedUserId = :assignedUserId', { assignedUserId });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findById(id: string, companyId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, companyId },
      relations: ['contact', 'whatsappNumber', 'assignedUser', 'department', 'tags'],
    });
    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }
    return conversation;
  }

  async findMessages(
    conversationId: string,
    companyId: string,
    before?: Date,
    limit = 50,
  ) {
    await this.findById(conversationId, companyId);

    const where: any = { conversationId, companyId };
    if (before) where.createdAt = LessThan(before);

    const data = await this.messageRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
    data.reverse();

    return { data, hasMore: data.length === limit };
  }

  async updateStatus(id: string, companyId: string, status?: ConversationStatus): Promise<Conversation> {
    const conversation = await this.findById(id, companyId);
    if (status !== undefined) conversation.status = status;
    return this.conversationRepository.save(conversation);
  }

  // Transfere a conversa pra um departamento e/ou pessoa — campos
  // independentes (undefined = não muda, null = limpa). Valida que o
  // destino pertence à mesma empresa, loga o evento de transferência e
  // notifica (sino) quem recebeu a conversa.
  async transfer(
    id: string,
    companyId: string,
    byUserId: string,
    dto: TransferConversationDto,
  ): Promise<Conversation> {
    if (dto.departmentId === undefined && dto.assignedUserId === undefined) {
      throw new BadRequestException('Informe departmentId e/ou assignedUserId');
    }

    const conversation = await this.findById(id, companyId);
    const fromDepartmentId = conversation.departmentId;
    const fromUserId = conversation.assignedUserId;
    const contactId = conversation.contactId;

    // Usa update() com patch de colunas em vez de save() numa entidade com
    // relações já carregadas: conversation.department/assignedUser (carregados
    // por findById) ficam com o valor ANTIGO em memória, e o TypeORM prioriza
    // a relação sobre o FK escalar ao salvar — isso silenciosamente ignorava
    // o null explícito de "devolver pra fila"/"remover delegação".
    const patch: Record<string, string | null> = {};
    if (dto.departmentId !== undefined) {
      if (dto.departmentId) await this.departmentsService.findById(dto.departmentId, companyId);
      patch.departmentId = dto.departmentId;
    }
    if (dto.assignedUserId !== undefined) {
      if (dto.assignedUserId) {
        const user = await this.userRepository.findOne({ where: { id: dto.assignedUserId, companyId } });
        if (!user) throw new NotFoundException('Usuário não encontrado');
      }
      patch.assignedUserId = dto.assignedUserId;
    }
    await this.conversationRepository.update({ id, companyId }, patch);
    const saved = { contactId };

    if (dto.departmentId !== undefined && dto.departmentId !== fromDepartmentId) {
      await this.createEvent(id, ConversationEventType.TRANSFERRED_TO_DEPARTMENT, {
        fromDepartmentId,
        toDepartmentId: dto.departmentId,
        byUserId,
      });
      if (dto.departmentId) {
        const memberIds = await this.departmentsService.findMemberIds(dto.departmentId, companyId);
        await Promise.all(
          memberIds.map((userId) =>
            this.notificationRepository.save(
              this.notificationRepository.create({
                companyId,
                userId,
                title: 'Nova conversa no departamento',
                conversationId: id,
                contactId: saved.contactId,
              }),
            ),
          ),
        );
      }
    }

    if (dto.assignedUserId !== undefined && dto.assignedUserId !== fromUserId) {
      await this.createEvent(id, ConversationEventType.TRANSFERRED_TO_USER, {
        fromUserId,
        toUserId: dto.assignedUserId,
        byUserId,
      });
      if (dto.assignedUserId) {
        await this.notificationRepository.save(
          this.notificationRepository.create({
            companyId,
            userId: dto.assignedUserId,
            title: 'Conversa transferida pra você',
            conversationId: id,
            contactId: saved.contactId,
          }),
        );
      }
    }

    // save() pode devolver a relação "department" desatualizada quando o FK
    // escalar é setado direto sem recarregar a relação — refaz o findById
    // pra garantir que a resposta reflete o estado real pós-save.
    return this.findById(id, companyId);
  }

  findDepartmentMemberIds(departmentId: string, companyId: string): Promise<string[]> {
    return this.departmentsService.findMemberIds(departmentId, companyId);
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
    defaultDepartmentId?: string | null,
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
        departmentId: defaultDepartmentId ?? null,
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
    whatsappNumberId?: string;
    costCents?: number;
    sentByUserId?: string | null;
  }): Promise<Message> {
    const message = this.messageRepository.create({
      ...data,
      sentAt: new Date(),
      status: data.status || MessageStatus.SENT,
    });
    const saved = await this.messageRepository.save(message);

    const update: any = {
      lastMessageAt: new Date(),
      waitingReply: data.direction === MessageDirection.INBOUND,
    };
    if (data.direction === MessageDirection.INBOUND) update.lastInboundAt = new Date();
    await this.conversationRepository.update(data.conversationId, update);

    return saved;
  }

  async updateAiState(conversationId: string, state: string | null): Promise<void> {
    await this.conversationRepository.update(conversationId, { aiState: state });
  }

  async setVariable(id: string, name: string, value: any): Promise<void> {
    await this.conversationRepository.query(
      `UPDATE conversations SET variables = COALESCE(variables, '{}'::jsonb) || $1::jsonb WHERE id = $2`,
      [JSON.stringify({ [name]: value }), id],
    );
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
