import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Not, In } from 'typeorm';
import { FollowOn, FollowOnStatus, FollowOnType } from './follow-on.entity';
import { AppNotification } from './notification.entity';
import { CreateFollowOnDto } from './dto/follow-on.dto';

@Injectable()
export class FollowOnsService {
  constructor(
    @InjectRepository(FollowOn)
    private readonly repo: Repository<FollowOn>,
    @InjectRepository(AppNotification)
    private readonly notifRepo: Repository<AppNotification>,
  ) {}

  async create(companyId: string, createdByUserId: string, dto: CreateFollowOnDto): Promise<FollowOn> {
    if (dto.type === FollowOnType.MESSAGE && !dto.message && !dto.templateName) {
      throw new BadRequestException('Informe uma mensagem ou template para o tipo "Enviar mensagem"');
    }
    const followOn = this.repo.create({
      ...dto,
      companyId,
      assignedUserId: dto.assignedUserId ?? createdByUserId,
      scheduledAt: new Date(dto.scheduledAt),
    });
    return this.repo.save(followOn);
  }

  findAll(companyId: string, filters: { userId?: string; status?: FollowOnStatus } = {}): Promise<FollowOn[]> {
    const where: any = { companyId };
    if (filters.userId) where.assignedUserId = filters.userId;
    if (filters.status) where.status = filters.status;
    return this.repo.find({
      where,
      relations: ['assignedUser'],
      order: { scheduledAt: 'ASC' },
    });
  }

  findByConversation(conversationId: string, companyId: string): Promise<FollowOn[]> {
    return this.repo.find({
      where: { conversationId, companyId },
      relations: ['assignedUser'],
      order: { scheduledAt: 'ASC' },
    });
  }

  async cancel(id: string, companyId: string): Promise<FollowOn> {
    const followOn = await this.repo.findOne({ where: { id, companyId } });
    if (!followOn) throw new NotFoundException('Follow-on não encontrado');
    if (followOn.status !== FollowOnStatus.PENDING) {
      throw new BadRequestException('Só é possível cancelar follow-ons pendentes');
    }
    followOn.status = FollowOnStatus.CANCELLED;
    return this.repo.save(followOn);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const followOn = await this.repo.findOne({ where: { id, companyId } });
    if (!followOn) throw new NotFoundException('Follow-on não encontrado');
    await this.repo.remove(followOn);
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
