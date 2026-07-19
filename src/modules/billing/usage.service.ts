import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSettings } from './platform-settings.entity';
import { BalanceTransaction, BalanceTransactionType } from './balance-transaction.entity';
import { Company } from '../companies/company.entity';
import { WhatsappNumber } from '../whatsapp/whatsapp-number.entity';
import { Message, MessageDirection } from '../conversations/message.entity';

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface SpendBreakdown {
  outboundCount: number;
  outboundCostCents: number;
  botCount: number;
  botCostCents: number;
  totalCostCents: number;
}

export interface DailySpend extends SpendBreakdown {
  date: string;
}

export interface TypeSpend {
  type: string;
  count: number;
  costCents: number;
}

export interface ExtractEntry {
  date: string;
  description: string;
  amountCents: number;
  balanceAfterCents: number;
}

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(PlatformSettings)
    private readonly settingsRepo: Repository<PlatformSettings>,
    @InjectRepository(BalanceTransaction)
    private readonly transactionRepo: Repository<BalanceTransaction>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(WhatsappNumber)
    private readonly numberRepo: Repository<WhatsappNumber>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async getSettings(): Promise<PlatformSettings> {
    const existing = await this.settingsRepo.find({ take: 1 });
    if (existing.length) return existing[0];
    return this.settingsRepo.save(this.settingsRepo.create({}));
  }

  async updateSettings(dto: Partial<Pick<PlatformSettings,
    'costPerOutboundMessageCents' | 'costPerBotMessageCents' | 'costPerFreeTextMessageCents' |
    'costPerMarketingMessageCents' | 'costPerUtilityMessageCents' | 'costPerAuthenticationMessageCents'
  >>): Promise<PlatformSettings> {
    const settings = await this.getSettings();
    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
  }

  /**
   * isBot: resposta automática do bot (sempre texto livre, nunca template).
   * isTemplate: mensagem usa um template aprovado (fora da janela de 24h).
   * category: categoria do template na Meta (MARKETING/UTILITY/AUTHENTICATION), quando conhecida.
   */
  async costForMessage(params: { isBot: boolean; isTemplate?: boolean; category?: string | null }): Promise<number> {
    const settings = await this.getSettings();
    if (params.isBot) return settings.costPerBotMessageCents;
    if (!params.isTemplate) return settings.costPerFreeTextMessageCents;

    switch (params.category) {
      case 'MARKETING':
        return settings.costPerMarketingMessageCents;
      case 'UTILITY':
        return settings.costPerUtilityMessageCents;
      case 'AUTHENTICATION':
        return settings.costPerAuthenticationMessageCents;
      default:
        return settings.costPerOutboundMessageCents;
    }
  }

  private async getSpendBreakdown(where: { whatsappNumberId?: string; companyId?: string }, since: Date, until?: Date): Promise<SpendBreakdown> {
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .select('m.aiPromptSource IS NOT NULL', 'isBot')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(m.costCents), 0)', 'costCents')
      .where('m.direction = :direction', { direction: MessageDirection.OUTBOUND })
      .andWhere('m.sentAt >= :since', { since })
      .groupBy('m.aiPromptSource IS NOT NULL');

    if (until) qb.andWhere('m.sentAt <= :until', { until });

    if (where.whatsappNumberId) qb.andWhere('m.whatsappNumberId = :whatsappNumberId', { whatsappNumberId: where.whatsappNumberId });
    if (where.companyId) qb.andWhere('m.companyId = :companyId', { companyId: where.companyId });

    const rows = await qb.getRawMany<{ isBot: boolean; count: string; costCents: string }>();

    const result: SpendBreakdown = { outboundCount: 0, outboundCostCents: 0, botCount: 0, botCostCents: 0, totalCostCents: 0 };
    for (const row of rows) {
      const count = Number(row.count);
      const cost = Number(row.costCents);
      if (row.isBot) {
        result.botCount = count;
        result.botCostCents = cost;
      } else {
        result.outboundCount = count;
        result.outboundCostCents = cost;
      }
    }
    result.totalCostCents = result.outboundCostCents + result.botCostCents;
    return result;
  }

  async assertCanSend(whatsappNumberId: string, companyId: string, costCents: number): Promise<void> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new ForbiddenException('Empresa não encontrada');
    if (company.balanceCents < costCents) {
      throw new ForbiddenException('Saldo insuficiente para enviar mensagem');
    }

    const number = await this.numberRepo.findOne({ where: { id: whatsappNumberId } });
    if (!number) throw new ForbiddenException('Número WhatsApp não encontrado');

    if (number.dailySpendLimitCents != null) {
      const daySpend = await this.getSpendBreakdown({ whatsappNumberId }, startOfDay());
      if (daySpend.totalCostCents + costCents > number.dailySpendLimitCents) {
        throw new ForbiddenException('Limite diário de gasto atingido para este número');
      }
    }

    if (number.monthlySpendLimitCents != null) {
      const monthSpend = await this.getSpendBreakdown({ whatsappNumberId }, startOfMonth());
      if (monthSpend.totalCostCents + costCents > number.monthlySpendLimitCents) {
        throw new ForbiddenException('Limite mensal de gasto atingido para este número');
      }
    }
  }

  async assertBudgetForBroadcast(
    companyId: string,
    recipientCount: number,
    params: { isTemplate: boolean; category?: string | null } = { isTemplate: false },
  ): Promise<void> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new ForbiddenException('Empresa não encontrada');

    const costPerMessage = await this.costForMessage({ isBot: false, ...params });
    const estimatedCents = recipientCount * costPerMessage;

    if (company.balanceCents < estimatedCents) {
      const estimated = (estimatedCents / 100).toFixed(2).replace('.', ',');
      const available = (company.balanceCents / 100).toFixed(2).replace('.', ',');
      throw new BadRequestException(
        `Saldo insuficiente para este broadcast. Custo estimado: R$ ${estimated}, saldo disponível: R$ ${available}`,
      );
    }
  }

  async recordSend(companyId: string, costCents: number): Promise<void> {
    if (costCents <= 0) return;
    await this.companyRepo.decrement({ id: companyId }, 'balanceCents', costCents);
  }

  async creditBalance(companyId: string, amountCents: number, reason: string | null, createdByUserId: string | null): Promise<Company> {
    await this.companyRepo.increment({ id: companyId }, 'balanceCents', amountCents);
    await this.transactionRepo.save(
      this.transactionRepo.create({
        companyId,
        amountCents,
        type: BalanceTransactionType.CREDIT,
        reason,
        createdByUserId,
      }),
    );
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    return company!;
  }

  getBalanceHistory(companyId: string): Promise<BalanceTransaction[]> {
    return this.transactionRepo.find({ where: { companyId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  async getDailyBreakdown(companyId: string, days: number): Promise<DailySpend[]> {
    const since = daysAgo(days);
    const rows = await this.messageRepo
      .createQueryBuilder('m')
      .select('DATE(m.sentAt)', 'date')
      .addSelect('m.aiPromptSource IS NOT NULL', 'isBot')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(m.costCents), 0)', 'costCents')
      .where('m.direction = :direction', { direction: MessageDirection.OUTBOUND })
      .andWhere('m.companyId = :companyId', { companyId })
      .andWhere('m.sentAt >= :since', { since })
      .groupBy('DATE(m.sentAt)')
      .addGroupBy('m.aiPromptSource IS NOT NULL')
      .getRawMany<{ date: string; isBot: boolean; count: string; costCents: string }>();

    const byDate = new Map<string, DailySpend>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = dateKey(d);
      byDate.set(key, { date: key, outboundCount: 0, outboundCostCents: 0, botCount: 0, botCostCents: 0, totalCostCents: 0 });
    }

    for (const row of rows) {
      const key = row.date;
      const entry = byDate.get(key);
      if (!entry) continue;
      const count = Number(row.count);
      const cost = Number(row.costCents);
      if (row.isBot) {
        entry.botCount = count;
        entry.botCostCents = cost;
      } else {
        entry.outboundCount = count;
        entry.outboundCostCents = cost;
      }
      entry.totalCostCents = entry.outboundCostCents + entry.botCostCents;
    }

    return Array.from(byDate.values());
  }

  async getTypeBreakdown(companyId: string, days: number): Promise<TypeSpend[]> {
    const since = daysAgo(days);
    const rows = await this.messageRepo
      .createQueryBuilder('m')
      .select('m.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(m.costCents), 0)', 'costCents')
      .where('m.direction = :direction', { direction: MessageDirection.OUTBOUND })
      .andWhere('m.companyId = :companyId', { companyId })
      .andWhere('m.sentAt >= :since', { since })
      .groupBy('m.type')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<{ type: string; count: string; costCents: string }>();

    return rows.map((row) => ({ type: row.type, count: Number(row.count), costCents: Number(row.costCents) }));
  }

  async getBalanceExtract(companyId: string, days: number): Promise<ExtractEntry[]> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new ForbiddenException('Empresa não encontrada');

    const since = daysAgo(days);
    const daily = await this.getDailyBreakdown(companyId, days);
    const credits = await this.transactionRepo
      .createQueryBuilder('t')
      .where('t.companyId = :companyId', { companyId })
      .andWhere('t.createdAt >= :since', { since })
      .orderBy('t.createdAt', 'ASC')
      .getMany();

    type RawEntry = { date: Date; description: string; amountCents: number };
    const rawEntries: RawEntry[] = [];

    for (const day of daily) {
      if (day.totalCostCents <= 0) continue;
      rawEntries.push({
        date: new Date(`${day.date}T12:00:00`),
        description: `${day.outboundCount} mensagem(ns) de saída, ${day.botCount} do bot`,
        amountCents: -day.totalCostCents,
      });
    }

    for (const tx of credits) {
      rawEntries.push({
        date: tx.createdAt,
        description: tx.reason || (tx.type === 'credit' ? 'Crédito manual' : 'Ajuste de saldo'),
        amountCents: tx.amountCents,
      });
    }

    rawEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

    const netInPeriod = rawEntries.reduce((sum, e) => sum + e.amountCents, 0);
    let running = company.balanceCents - netInPeriod;

    const withBalance: ExtractEntry[] = rawEntries.map((e) => {
      running += e.amountCents;
      return {
        date: e.date.toISOString(),
        description: e.description,
        amountCents: e.amountCents,
        balanceAfterCents: running,
      };
    });

    return withBalance.reverse();
  }

  async getInternalSpendForNumber(whatsappNumberId: string, since: Date, until: Date): Promise<SpendBreakdown> {
    return this.getSpendBreakdown({ whatsappNumberId }, since, until);
  }

  async getUsageSummary(companyId: string) {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new ForbiddenException('Empresa não encontrada');

    const numbers = await this.numberRepo.find({ where: { companyId, isActive: true } });

    const perNumber = await Promise.all(
      numbers.map(async (number) => ({
        whatsappNumberId: number.id,
        displayName: number.displayName,
        dailySpendLimitCents: number.dailySpendLimitCents,
        monthlySpendLimitCents: number.monthlySpendLimitCents,
        today: await this.getSpendBreakdown({ whatsappNumberId: number.id }, startOfDay()),
        month: await this.getSpendBreakdown({ whatsappNumberId: number.id }, startOfMonth()),
      })),
    );

    return {
      balanceCents: company.balanceCents,
      numbers: perNumber,
    };
  }
}
