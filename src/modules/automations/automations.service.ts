import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationRule, AutomationTriggerType } from './automation-rule.entity';
import { AutomationExecution, AutomationExecutionStatus } from './automation-execution.entity';
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from './dto/create-automation-rule.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    @InjectRepository(AutomationRule)
    private readonly ruleRepo: Repository<AutomationRule>,
    @InjectRepository(AutomationExecution)
    private readonly execRepo: Repository<AutomationExecution>,
    private readonly whatsappService: WhatsappService,
  ) {}

  findAll(companyId: string): Promise<AutomationRule[]> {
    return this.ruleRepo.find({
      where: { companyId },
      relations: ['whatsappNumber'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, companyId: string): Promise<AutomationRule> {
    const rule = await this.ruleRepo.findOne({ where: { id, companyId }, relations: ['whatsappNumber'] });
    if (!rule) throw new NotFoundException('Automação não encontrada');
    return rule;
  }

  async create(companyId: string, dto: CreateAutomationRuleDto): Promise<AutomationRule> {
    const rule = this.ruleRepo.create({ ...dto, companyId, triggerOffsetDays: dto.triggerOffsetDays ?? 0 });
    return this.ruleRepo.save(rule);
  }

  async update(id: string, companyId: string, dto: UpdateAutomationRuleDto): Promise<AutomationRule> {
    const rule = await this.findOne(id, companyId);
    Object.assign(rule, dto);
    return this.ruleRepo.save(rule);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const rule = await this.findOne(id, companyId);
    await this.ruleRepo.remove(rule);
  }

  findExecutions(companyId: string, ruleId: string): Promise<AutomationExecution[]> {
    return this.execRepo.find({
      where: { companyId, ruleId },
      relations: ['contact'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /** Ponto de entrada do cron: roda todas as regras ativas de todas as empresas */
  async runAll(): Promise<void> {
    const activeRules = await this.ruleRepo.find({ where: { isActive: true } });
    for (const rule of activeRules) {
      try {
        await this.runRule(rule);
      } catch (err) {
        this.logger.error(`Erro ao processar regra ${rule.id}: ${err.message}`);
      }
    }
  }

  private async runRule(rule: AutomationRule): Promise<void> {
    switch (rule.type) {
      case AutomationTriggerType.BIRTHDAY:
        return this.runBirthday(rule);
      case AutomationTriggerType.PAYMENT_OVERDUE:
        return this.runPaymentOverdue(rule);
      case AutomationTriggerType.REPURCHASE:
        return this.runRepurchase(rule);
    }
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  private toDateStr(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private resolveTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
  }

  private async alreadySent(ruleId: string, contactId: string, dedupeKey: string): Promise<boolean> {
    const count = await this.execRepo.count({ where: { ruleId, contactId, dedupeKey } });
    return count > 0;
  }

  private async sendAndRecord(
    rule: AutomationRule,
    contact: { id: string; phone: string; name: string },
    message: string,
    dedupeKey: string,
  ): Promise<void> {
    if (await this.alreadySent(rule.id, contact.id, dedupeKey)) return;

    let status = AutomationExecutionStatus.SENT;
    let error: string | null = null;

    try {
      await this.whatsappService.sendMessage(rule.companyId, {
        whatsappNumberId: rule.whatsappNumberId,
        to: contact.phone,
        type: 'text',
        message,
      });
    } catch (err) {
      status = AutomationExecutionStatus.FAILED;
      error = err?.response?.data?.error?.message || err?.message || 'Erro desconhecido';
      this.logger.warn(`Automação ${rule.id} falhou para ${contact.phone}: ${error}`);
    }

    await this.execRepo.save(
      this.execRepo.create({
        companyId: rule.companyId,
        ruleId: rule.id,
        contactId: contact.id,
        dedupeKey,
        status,
        error,
      }),
    );
  }

  private async runBirthday(rule: AutomationRule): Promise<void> {
    // Dispara para contatos cujo mês+dia de aniversário = hoje + offset
    const targetDate = this.addDays(new Date(), rule.triggerOffsetDays);
    const targetMonth = targetDate.getMonth() + 1;
    const targetDay = targetDate.getDate();
    const year = new Date().getFullYear();

    const contacts = await this.ruleRepo.manager.query(
      `SELECT id, phone, name FROM contacts
       WHERE company_id = $1
         AND birth_date IS NOT NULL
         AND EXTRACT(MONTH FROM birth_date::date) = $2
         AND EXTRACT(DAY FROM birth_date::date) = $3`,
      [rule.companyId, targetMonth, targetDay],
    );

    for (const contact of contacts) {
      const firstName = contact.name?.split(' ')[0] || contact.name || '';
      const message = this.resolveTemplate(rule.messageTemplate, {
        nome: contact.name || '',
        primeiro_nome: firstName,
      });
      await this.sendAndRecord(rule, contact, message, `birthday-${year}`);
    }
  }

  private async runPaymentOverdue(rule: AutomationRule): Promise<void> {
    // Dispara para vendas pendentes cujo vencimento = hoje - offset
    const targetDate = this.addDays(new Date(), -rule.triggerOffsetDays);
    const targetDateStr = this.toDateStr(targetDate);

    const sales = await this.ruleRepo.manager.query(
      `SELECT s.id as sale_id, s.due_date, c.id, c.phone, c.name, p.name as product_name,
              CURRENT_DATE - s.due_date::date AS dias_atraso
       FROM sales s
       JOIN contacts c ON s.contact_id = c.id
       JOIN products p ON s.product_id = p.id
       WHERE s.company_id = $1
         AND s.payment_status = 'pending'
         AND s.due_date = $2`,
      [rule.companyId, targetDateStr],
    );

    for (const row of sales) {
      const firstName = row.name?.split(' ')[0] || row.name || '';
      const dueDateFormatted = row.due_date?.slice(0, 10).split('-').reverse().join('/') || '';
      const message = this.resolveTemplate(rule.messageTemplate, {
        nome: row.name || '',
        primeiro_nome: firstName,
        produto: row.product_name || '',
        data_vencimento: dueDateFormatted,
        dias_atraso: String(row.dias_atraso || 0),
      });
      await this.sendAndRecord(rule, { id: row.id, phone: row.phone, name: row.name }, message, `overdue-${row.sale_id}`);
    }
  }

  private async runRepurchase(rule: AutomationRule): Promise<void> {
    // Dispara quando hoje = última compra + intervalo + offset
    const today = this.toDateStr(this.addDays(new Date(), -rule.triggerOffsetDays));

    const rows = await this.ruleRepo.manager.query(
      `SELECT
         c.id, c.phone, c.name,
         p.id AS product_id, p.name AS product_name,
         MAX(s.sale_date::date) AS last_sale_date,
         COALESCE(cps.repurchase_interval_days, p.repurchase_interval_days) AS interval_days
       FROM sales s
       JOIN contacts c ON s.contact_id = c.id
       JOIN products p ON s.product_id = p.id
       LEFT JOIN contact_product_settings cps
         ON cps.contact_id = s.contact_id AND cps.product_id = s.product_id AND cps.company_id = s.company_id
       WHERE s.company_id = $1
         AND (p.repurchase_interval_days IS NOT NULL OR cps.repurchase_interval_days IS NOT NULL)
       GROUP BY c.id, c.phone, c.name, p.id, p.name, cps.repurchase_interval_days, p.repurchase_interval_days
       HAVING (MAX(s.sale_date::date) + (COALESCE(cps.repurchase_interval_days, p.repurchase_interval_days) || ' days')::interval)::date = $2`,
      [rule.companyId, today],
    );

    for (const row of rows) {
      const firstName = row.name?.split(' ')[0] || row.name || '';
      const message = this.resolveTemplate(rule.messageTemplate, {
        nome: row.name || '',
        primeiro_nome: firstName,
        produto: row.product_name || '',
      });
      const dedupeKey = `repurchase-${row.product_id}-${today}`;
      await this.sendAndRecord(rule, { id: row.id, phone: row.phone, name: row.name }, message, dedupeKey);
    }
  }
}
