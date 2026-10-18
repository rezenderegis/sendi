import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deal } from './deal.entity';
import { DealKanbanEvent, DealKanbanEventAction } from './deal-kanban-event.entity';
import { Contact } from '../contacts/contact.entity';
import { Conversation } from '../conversations/conversation.entity';
import { KanbanColumn } from '../kanban-columns/kanban-column.entity';
import { CreateDealDto, UpdateDealDto } from './dto/deal.dto';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
    @InjectRepository(DealKanbanEvent)
    private readonly kanbanEventRepository: Repository<DealKanbanEvent>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(KanbanColumn)
    private readonly kanbanColumnRepository: Repository<KanbanColumn>,
  ) {}

  async findForKanban(
    companyId: string,
    status: 'active' | 'lost' | 'all' = 'active',
  ): Promise<(Deal & { conversation: Conversation | null })[]> {
    const qb = this.dealRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.contact', 'contact')
      .leftJoinAndSelect('contact.tags', 'tags')
      .leftJoinAndSelect('d.dealOwner', 'dealOwner')
      .where('d.companyId = :companyId', { companyId });

    if (status === 'active') qb.andWhere('d."lostAt" IS NULL');
    else if (status === 'lost') qb.andWhere('d."lostAt" IS NOT NULL').orderBy('d."lostAt"', 'DESC');

    const deals = await qb.getMany();

    if (deals.length === 0) return [];

    // Conversa mais recente de cada contato, com os dados usados no card do Kanban.
    const contactIds = [...new Set(deals.map((d) => d.contactId))];
    const conversations = await this.conversationRepository
      .createQueryBuilder('conv')
      .leftJoinAndSelect('conv.whatsappNumber', 'whatsappNumber')
      .leftJoinAndSelect('conv.assignedUser', 'assignedUser')
      .leftJoinAndSelect('conv.tags', 'convTags')
      .where('conv.contactId IN (:...ids)', { ids: contactIds })
      .orderBy('conv.lastMessageAt', 'DESC')
      .getMany();

    const conversationByContact = new Map<string, Conversation>();
    for (const conv of conversations) {
      if (!conversationByContact.has(conv.contactId)) {
        conversationByContact.set(conv.contactId, conv);
      }
    }

    return deals.map((d) => Object.assign(d, { conversation: conversationByContact.get(d.contactId) ?? null }));
  }

  async findById(id: string, companyId: string): Promise<Deal> {
    const deal = await this.dealRepository.findOne({ where: { id, companyId }, relations: ['contact', 'dealOwner'] });
    if (!deal) throw new NotFoundException('Negócio não encontrado');
    return deal;
  }

  private async generateTitle(contactId: string, companyId: string): Promise<string> {
    const contact = await this.contactRepository.findOne({ where: { id: contactId, companyId } });
    const name = contact?.name ?? 'Negócio';
    const existingCount = await this.dealRepository.count({ where: { contactId, companyId } });
    return existingCount === 0 ? name : `${name} — Negócio ${existingCount + 1}`;
  }

  async create(companyId: string, dto: CreateDealDto): Promise<Deal> {
    const contact = await this.contactRepository.findOne({ where: { id: dto.contactId, companyId } });
    if (!contact) throw new NotFoundException('Contato não encontrado');

    const title = dto.title?.trim() || (await this.generateTitle(dto.contactId, companyId));
    const deal = this.dealRepository.create({
      companyId,
      contactId: dto.contactId,
      title,
      kanbanColumnId: dto.kanbanColumnId ?? null,
      kanbanColumnChangedAt: dto.kanbanColumnId ? new Date() : null,
      dealValue: dto.dealValue ?? null,
      dealOwnerId: dto.dealOwnerId ?? null,
    });
    const saved = await this.dealRepository.save(deal);

    if (dto.kanbanColumnId) {
      await this.kanbanEventRepository.save(
        this.kanbanEventRepository.create({
          companyId,
          dealId: saved.id,
          fromColumnId: null,
          toColumnId: dto.kanbanColumnId,
          action: DealKanbanEventAction.MOVED,
        }),
      );
    }

    return saved;
  }

  async update(id: string, companyId: string, dto: UpdateDealDto): Promise<Deal> {
    const deal = await this.findById(id, companyId);

    const isMovingColumn =
      dto.kanbanColumnId !== undefined && dto.kanbanColumnId !== (deal.kanbanColumnId ?? null);
    const fromColumnId = deal.kanbanColumnId ?? null;

    Object.assign(deal, dto);
    if (isMovingColumn) deal.kanbanColumnChangedAt = new Date();

    const saved = await this.dealRepository.save(deal);

    if (isMovingColumn) {
      await this.kanbanEventRepository.save(
        this.kanbanEventRepository.create({
          companyId,
          dealId: id,
          fromColumnId,
          toColumnId: dto.kanbanColumnId ?? null,
          action: DealKanbanEventAction.MOVED,
        }),
      );
    }

    return saved;
  }

  async markLost(id: string, companyId: string, reason: string): Promise<Deal> {
    const deal = await this.findById(id, companyId);
    deal.lostAt = new Date();
    deal.lostReason = reason;
    const saved = await this.dealRepository.save(deal);

    await this.kanbanEventRepository.save(
      this.kanbanEventRepository.create({
        companyId,
        dealId: id,
        fromColumnId: deal.kanbanColumnId ?? null,
        toColumnId: null,
        action: DealKanbanEventAction.LOST,
        reason,
      }),
    );

    return saved;
  }

  async reopen(id: string, companyId: string): Promise<Deal> {
    const deal = await this.findById(id, companyId);
    deal.lostAt = null;
    deal.lostReason = null;
    const saved = await this.dealRepository.save(deal);

    await this.kanbanEventRepository.save(
      this.kanbanEventRepository.create({
        companyId,
        dealId: id,
        fromColumnId: null,
        toColumnId: deal.kanbanColumnId ?? null,
        action: DealKanbanEventAction.REOPENED,
      }),
    );

    return saved;
  }

  async getFunnel(companyId: string, days: number) {
    const since = new Date(Date.now() - days * 24 * 3600000);

    const columns = await this.kanbanColumnRepository.find({
      where: { companyId },
      order: { position: 'ASC' },
    });

    // Snapshot: quantos negócios ativos estão em cada raia agora.
    const activeCounts = await this.dealRepository
      .createQueryBuilder('d')
      .select('d."kanbanColumnId"', 'columnId')
      .addSelect('COUNT(*)', 'count')
      .where('d.companyId = :companyId', { companyId })
      .andWhere('d."lostAt" IS NULL')
      .andWhere('d."kanbanColumnId" IS NOT NULL')
      .groupBy('d."kanbanColumnId"')
      .getRawMany<{ columnId: string; count: string }>();
    const activeByColumn = new Map(activeCounts.map((r) => [r.columnId, Number(r.count)]));

    // Quantos negócios entraram em cada raia no período (histórico de movimentação).
    const enteredCounts = await this.kanbanEventRepository
      .createQueryBuilder('e')
      .select('e."toColumnId"', 'columnId')
      .addSelect('COUNT(*)', 'count')
      .where('e.companyId = :companyId', { companyId })
      .andWhere('e.action = :action', { action: DealKanbanEventAction.MOVED })
      .andWhere('e."toColumnId" IS NOT NULL')
      .andWhere('e."createdAt" >= :since', { since })
      .groupBy('e."toColumnId"')
      .getRawMany<{ columnId: string; count: string }>();
    const enteredByColumn = new Map(enteredCounts.map((r) => [r.columnId, Number(r.count)]));

    const funnel = columns.map((col) => ({
      columnId: col.id,
      columnName: col.name,
      columnColor: col.color,
      activeCount: activeByColumn.get(col.id) ?? 0,
      enteredCount: enteredByColumn.get(col.id) ?? 0,
    }));

    // Perdidos no período + motivos mais comuns.
    const lostEvents = await this.kanbanEventRepository
      .createQueryBuilder('e')
      .where('e.companyId = :companyId', { companyId })
      .andWhere('e.action = :action', { action: DealKanbanEventAction.LOST })
      .andWhere('e."createdAt" >= :since', { since })
      .getMany();

    const reasonCounts = new Map<string, number>();
    for (const ev of lostEvents) {
      const key = ev.reason?.trim() || 'Sem motivo informado';
      reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
    }
    const topLostReasons = [...reasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    const activePipelineCount = [...activeByColumn.values()].reduce((sum, n) => sum + n, 0);
    const enteredTotal = [...enteredByColumn.values()].reduce((sum, n) => sum + n, 0);
    const lostTotal = lostEvents.length;
    const conversionRate = enteredTotal > 0 ? activePipelineCount / enteredTotal : null;

    return {
      days,
      activePipelineCount,
      lostTotal,
      conversionRate,
      columns: funnel,
      topLostReasons,
    };
  }
}
