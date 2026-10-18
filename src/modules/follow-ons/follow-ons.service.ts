import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Not, In } from 'typeorm';
import { FollowOn, FollowOnStatus, FollowOnType } from './follow-on.entity';
import { AppNotification } from './notification.entity';
import { CreateFollowOnDto, UpdateFollowOnDto } from './dto/follow-on.dto';
import { Conversation } from '../conversations/conversation.entity';
import { ActivityType, DEFAULT_ACTIVITY_TYPE_NAMES } from '../teams/activity-type.entity';

@Injectable()
export class FollowOnsService {
  constructor(
    @InjectRepository(FollowOn)
    private readonly repo: Repository<FollowOn>,
    @InjectRepository(AppNotification)
    private readonly notifRepo: Repository<AppNotification>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ActivityType)
    private readonly activityTypeRepo: Repository<ActivityType>,
  ) {}

  // Quando activityTypeId não vem explícito, resolve um padrão a partir do
  // "type" técnico (reunião -> "Reunião", qualquer outro -> "Tarefa"). Se o
  // nome não existir mais na empresa (renomeado/excluído), fica null sem erro.
  private async resolveDefaultActivityTypeId(companyId: string, type: FollowOnType): Promise<string | null> {
    const name = type === FollowOnType.MEETING ? DEFAULT_ACTIVITY_TYPE_NAMES[1] : DEFAULT_ACTIVITY_TYPE_NAMES[0];
    const activityType = await this.activityTypeRepo.findOne({ where: { companyId, name } });
    return activityType?.id ?? null;
  }

  private async attachLatestConversationId<T extends FollowOn>(followOns: T[]): Promise<(T & { conversationId: string | null })[]> {
    if (!followOns.length) return [];
    const contactIds = [...new Set(followOns.map((fo) => fo.contactId))];
    const conversations = await this.conversationRepo
      .createQueryBuilder('conv')
      .select(['conv.id', 'conv.contactId'])
      .where('conv.contactId IN (:...ids)', { ids: contactIds })
      .orderBy('conv.lastMessageAt', 'DESC')
      .getMany();

    const byContact = new Map<string, string>();
    for (const conv of conversations) {
      if (!byContact.has(conv.contactId)) byContact.set(conv.contactId, conv.id);
    }

    return followOns.map((fo) => Object.assign(fo, { conversationId: byContact.get(fo.contactId) ?? null }));
  }

  async create(companyId: string, createdByUserId: string, dto: CreateFollowOnDto): Promise<FollowOn> {
    if (dto.type === FollowOnType.MESSAGE) {
      if (!dto.message && !dto.templateName) {
        throw new BadRequestException('Informe uma mensagem ou template para o tipo "Enviar mensagem"');
      }
      if (!dto.whatsappNumberId) {
        throw new BadRequestException('Selecione de qual número de WhatsApp a mensagem será enviada');
      }
    }
    if (dto.type === FollowOnType.NOTE && !dto.note?.trim()) {
      throw new BadRequestException('Informe o texto da anotação');
    }

    // Nota não é uma atividade pendente — é um registro já concluído na
    // hora da criação, não entra no ciclo de agendamento/cron.
    const isNote = dto.type === FollowOnType.NOTE;
    const activityTypeId = dto.activityTypeId ?? (await this.resolveDefaultActivityTypeId(companyId, dto.type));
    const followOn = this.repo.create({
      ...dto,
      companyId,
      assignedUserId: dto.assignedUserId ?? createdByUserId,
      activityTypeId,
      scheduledAt: isNote ? new Date() : new Date(dto.scheduledAt),
      ...(isNote ? { status: FollowOnStatus.DONE, sentAt: new Date() } : {}),
    });
    return this.repo.save(followOn);
  }

  async findAll(companyId: string, filters: { userId?: string; status?: FollowOnStatus } = {}) {
    const where: any = { companyId };
    if (filters.userId) where.assignedUserId = filters.userId;
    if (filters.status) where.status = filters.status;
    const followOns = await this.repo.find({
      where,
      relations: ['assignedUser', 'contact'],
      order: { scheduledAt: 'ASC' },
    });
    return this.attachLatestConversationId(followOns);
  }

  async findByContact(contactId: string, companyId: string) {
    const followOns = await this.repo.find({
      where: { contactId, companyId },
      relations: ['assignedUser'],
      order: { scheduledAt: 'DESC' },
    });
    return this.attachLatestConversationId(followOns);
  }

  async complete(id: string, companyId: string): Promise<FollowOn> {
    const followOn = await this.repo.findOne({ where: { id, companyId } });
    if (!followOn) throw new NotFoundException('Follow-on não encontrado');
    followOn.status = FollowOnStatus.DONE;
    followOn.sentAt = new Date();
    return this.repo.save(followOn);
  }

  async reopen(id: string, companyId: string): Promise<FollowOn> {
    const followOn = await this.repo.findOne({ where: { id, companyId } });
    if (!followOn) throw new NotFoundException('Follow-on não encontrado');
    followOn.status = FollowOnStatus.PENDING;
    followOn.sentAt = null;
    return this.repo.save(followOn);
  }

  async cancel(id: string, companyId: string): Promise<FollowOn> {
    const followOn = await this.repo.findOne({ where: { id, companyId } });
    if (!followOn) throw new NotFoundException('Follow-on não encontrado');
    followOn.status = FollowOnStatus.CANCELLED;
    return this.repo.save(followOn);
  }

  async update(id: string, companyId: string, dto: UpdateFollowOnDto): Promise<FollowOn> {
    const followOn = await this.repo.findOne({ where: { id, companyId } });
    if (!followOn) throw new NotFoundException('Follow-on não encontrado');
    Object.assign(followOn, {
      ...dto,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : followOn.scheduledAt,
    });
    return this.repo.save(followOn);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const followOn = await this.repo.findOne({ where: { id, companyId } });
    if (!followOn) throw new NotFoundException('Follow-on não encontrado');
    await this.repo.softDelete(id);
  }

  async findPendingDue(): Promise<FollowOn[]> {
    return this.repo.find({
      where: {
        status: FollowOnStatus.PENDING,
        scheduledAt: LessThanOrEqual(new Date()),
      },
      relations: ['assignedUser'],
    });
  }

  async markDone(id: string, sentAt?: Date): Promise<void> {
    await this.repo.update(id, {
      status: FollowOnStatus.DONE,
      sentAt: sentAt ?? new Date(),
    });
  }

  // Notifications
  async createNotification(data: {
    companyId: string;
    userId: string;
    title: string;
    body?: string;
    conversationId?: string;
    contactId?: string;
    followOnId?: string;
  }): Promise<void> {
    await this.notifRepo.save(this.notifRepo.create(data));
  }

  findUnreadNotifications(userId: string, companyId: string): Promise<AppNotification[]> {
    return this.notifRepo.find({
      where: { userId, companyId, readAt: null as any },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  findAllNotifications(userId: string, companyId: string): Promise<AppNotification[]> {
    return this.notifRepo.find({
      where: { userId, companyId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    await this.notifRepo.update({ id, userId }, { readAt: new Date() });
  }

  async markAllNotificationsRead(userId: string, companyId: string): Promise<void> {
    await this.notifRepo.update({ userId, companyId, readAt: null as any }, { readAt: new Date() });
  }
}
