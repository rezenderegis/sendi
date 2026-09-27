import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CampaignPrompt } from './campaign-prompt.entity';
import { PromptVersion } from './prompt-version.entity';
import { Broadcast, BroadcastStatus } from '../broadcasts/broadcast.entity';
import { AutomationRule } from '../automations/automation-rule.entity';
import { AutomationExecution } from '../automations/automation-execution.entity';
import { ConversationEvent, ConversationEventType } from '../conversations/conversation-event.entity';
import { CreateCampaignPromptDto, UpdateCampaignPromptDto } from './dto/campaign-prompt.dto';

const MAX_VERSIONS = 20;

export interface PromptExecutionRow {
  conversationId: string;
  contactName: string;
  contactPhone: string;
  activatedAt: Date;
  source: 'broadcast' | 'automation';
  sourceLabel: string;
}

@Injectable()
export class CampaignPromptsService {
  constructor(
    @InjectRepository(CampaignPrompt)
    private readonly repo: Repository<CampaignPrompt>,
    @InjectRepository(PromptVersion)
    private readonly versionRepo: Repository<PromptVersion>,
    @InjectRepository(Broadcast)
    private readonly broadcastRepo: Repository<Broadcast>,
    @InjectRepository(AutomationRule)
    private readonly automationRuleRepo: Repository<AutomationRule>,
    @InjectRepository(AutomationExecution)
    private readonly automationExecutionRepo: Repository<AutomationExecution>,
    @InjectRepository(ConversationEvent)
    private readonly eventRepo: Repository<ConversationEvent>,
  ) {}

  async getExecutions(id: string, companyId: string): Promise<PromptExecutionRow[]> {
    const prompt = await this.repo.findOne({ where: { id, companyId } });
    if (!prompt) throw new NotFoundException('Prompt não encontrado');

    const broadcasts = await this.broadcastRepo.find({ where: { campaignPromptId: id, companyId } });
    const broadcastNameById = new Map(broadcasts.map((b) => [b.id, b.name]));
    const broadcastIds = broadcasts.map((b) => b.id);

    let broadcastRows: any[] = [];
    if (broadcastIds.length) {
      broadcastRows = await this.eventRepo
        .createQueryBuilder('e')
        .innerJoin('conversations', 'c', 'c.id = e."conversationId"')
        .innerJoin('contacts', 'ct', 'ct.id = c."contactId"')
        .where('e.type = :type', { type: ConversationEventType.CAMPAIGN_ACTIVATED })
        .andWhere(`e.metadata->>'broadcastId' IN (:...broadcastIds)`, { broadcastIds })
        .select([
          'e."conversationId" as "conversationId"',
          'e."createdAt" as "activatedAt"',
          `e.metadata->>'broadcastId' as "broadcastId"`,
          'ct.name as "contactName"',
          'ct.phone as "contactPhone"',
        ])
        .getRawMany();
    }

    const rules = await this.automationRuleRepo.find({ where: { campaignPromptId: id, companyId } });
    const ruleNameById = new Map(rules.map((r) => [r.id, r.name]));
    const ruleIds = rules.map((r) => r.id);

    let automationRows: any[] = [];
    if (ruleIds.length) {
      automationRows = await this.automationExecutionRepo
        .createQueryBuilder('ae')
        .innerJoin('contacts', 'ct', 'ct.id = ae."contactId"')
        .where('ae."ruleId" IN (:...ruleIds)', { ruleIds })
        .andWhere('ae."conversationId" IS NOT NULL')
        .select([
          'ae."conversationId" as "conversationId"',
          'ae."createdAt" as "activatedAt"',
          'ae."ruleId" as "ruleId"',
          'ct.name as "contactName"',
          'ct.phone as "contactPhone"',
        ])
        .getRawMany();
    }

    const rows: PromptExecutionRow[] = [
      ...broadcastRows.map((r) => ({
        conversationId: r.conversationId,
        contactName: r.contactName,
        contactPhone: r.contactPhone,
        activatedAt: r.activatedAt,
        source: 'broadcast' as const,
        sourceLabel: broadcastNameById.get(r.broadcastId) ?? 'Broadcast',
      })),
      ...automationRows.map((r) => ({
        conversationId: r.conversationId,
        contactName: r.contactName,
        contactPhone: r.contactPhone,
        activatedAt: r.activatedAt,
        source: 'automation' as const,
        sourceLabel: ruleNameById.get(r.ruleId) ?? 'Automação',
      })),
    ];

    rows.sort((a, b) => new Date(b.activatedAt).getTime() - new Date(a.activatedAt).getTime());
    return rows.slice(0, 50);
  }

  findAll(companyId: string): Promise<CampaignPrompt[]> {
    return this.repo.find({ where: { companyId }, order: { name: 'ASC' } });
  }

  create(companyId: string, dto: CreateCampaignPromptDto): Promise<CampaignPrompt> {
    return this.repo.save(this.repo.create({ ...dto, companyId }));
  }

  async update(id: string, companyId: string, dto: UpdateCampaignPromptDto): Promise<CampaignPrompt> {
    const prompt = await this.repo.findOne({ where: { id, companyId } });
    if (!prompt) throw new NotFoundException('Prompt não encontrado');

    await this.saveVersion(prompt);

    Object.assign(prompt, dto);
    return this.repo.save(prompt);
  }

  async delete(id: string, companyId: string): Promise<void> {
    const prompt = await this.repo.findOne({ where: { id, companyId } });
    if (!prompt) throw new NotFoundException('Prompt não encontrado');

    const broadcastInUse = await this.broadcastRepo.count({
      where: {
        campaignPromptId: id,
        status: In([BroadcastStatus.DRAFT, BroadcastStatus.QUEUED, BroadcastStatus.SENDING]),
      },
    });
    if (broadcastInUse > 0) {
      throw new BadRequestException(
        'Este prompt está vinculado a um broadcast ativo. Remova-o dos broadcasts antes de excluir.',
      );
    }

    const automationInUse = await this.automationRuleRepo.count({
      where: { campaignPromptId: id, isActive: true },
    });
    if (automationInUse > 0) {
      throw new BadRequestException(
        'Este prompt está vinculado a uma automação ativa. Desative ou remova-o das automações antes de excluir.',
      );
    }

    await this.repo.remove(prompt);
  }

  async getVersions(id: string, companyId: string): Promise<PromptVersion[]> {
    const prompt = await this.repo.findOne({ where: { id, companyId } });
    if (!prompt) throw new NotFoundException('Prompt não encontrado');
    return this.versionRepo.find({
      where: { promptId: id },
      order: { savedAt: 'DESC' },
    });
  }

  async restore(id: string, companyId: string, versionId: string): Promise<CampaignPrompt> {
    const prompt = await this.repo.findOne({ where: { id, companyId } });
    if (!prompt) throw new NotFoundException('Prompt não encontrado');

    const version = await this.versionRepo.findOne({ where: { id: versionId, promptId: id } });
    if (!version) throw new NotFoundException('Versão não encontrada');

    await this.saveVersion(prompt);

    prompt.name = version.name;
    prompt.content = version.content;
    return this.repo.save(prompt);
  }

  private async saveVersion(prompt: CampaignPrompt): Promise<void> {
    await this.versionRepo.save(
      this.versionRepo.create({
        promptId: prompt.id,
        name: prompt.name,
        content: prompt.content,
      }),
    );

    const all = await this.versionRepo.find({
      where: { promptId: prompt.id },
      order: { savedAt: 'DESC' },
    });
    if (all.length > MAX_VERSIONS) {
      await this.versionRepo.remove(all.slice(MAX_VERSIONS));
    }
  }
}
