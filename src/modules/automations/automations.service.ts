import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationRule, AutomationTriggerType } from './automation-rule.entity';
import { AutomationExecution, AutomationExecutionStatus } from './automation-execution.entity';
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from './dto/create-automation-rule.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';

export interface UpcomingDispatch {
  date: string;
  rule: { id: string; name: string; type: AutomationTriggerType };
  contact: { id: string; name: string; phone: string };
  wouldSkip: boolean;
}

export interface AutomationStats {
  sent: number;
  failed: number;
  delivered: number;
  read: number;
  responded: number;
}

export interface AutomationHistoryItem {
  id: string;
  companyId: string;
  ruleId: string;
  ruleName: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  dedupeKey: string;
  conversationId: string | null;
  resolvedMessage: string | null;
  status: AutomationExecutionStatus;
  error: string | null;
  messageStatus: string | null;
  responded: boolean;
  createdAt: Date;
}

export interface PaginatedHistory {
  data: AutomationHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

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
    const rule = this.ruleRepo.create({
      ...dto,
      companyId,
      triggerOffsetDays: dto.triggerOffsetDays ?? 0,
      messageType: dto.messageType ?? 'text',
      templateLanguage: dto.templateLanguage ?? 'pt_BR',
    });
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

  /** Disparo manual: roda apenas as regras ativas da empresa solicitante */
  async runNow(companyId: string): Promise<{ triggered: number }> {
    const activeRules = await this.ruleRepo.find({ where: { companyId, isActive: true } });
    const before = await this.execRepo.count({ where: { companyId } });
    for (const rule of activeRules) {
      try {
        await this.runRule(rule);
      } catch (err) {
        this.logger.error(`Erro ao processar regra ${rule.id}: ${err.message}`);
      }
    }
    const after = await this.execRepo.count({ where: { companyId } });
    return { triggered: after - before };
  }

  /** Público da regra hoje: quem seria atingido e qual o status de cada um */
  async getAudience(ruleId: string, companyId: string): Promise<{
    contacts: Array<{
      contactId: string;
      contactName: string;
      contactPhone: string;
      status: 'will_send' | 'already_sent' | 'opted_out';
      extra?: string;
    }>;
    total: number;
    willSend: number;
  }> {
    const rule = await this.findOne(ruleId, companyId);
    const today = new Date();
    const todayStr = this.toDateStr(today);
    const year = today.getFullYear();

    let rawContacts: Array<{ id: string; name: string; phone: string; extra?: string }> = [];

    if (rule.type === AutomationTriggerType.BIRTHDAY) {
      const targetDate = this.addDays(today, rule.triggerOffsetDays);
      const month = targetDate.getMonth() + 1;
      const day = targetDate.getDate();
      const rows = await this.ruleRepo.manager.query(
        `SELECT id, phone, name FROM contacts
         WHERE company_id = $1
           AND birth_date IS NOT NULL
           AND EXTRACT(MONTH FROM birth_date::date) = $2
           AND EXTRACT(DAY FROM birth_date::date) = $3`,
        [companyId, month, day],
      );
      rawContacts = rows;
    } else if (rule.type === AutomationTriggerType.PAYMENT_OVERDUE) {
      const targetDate = this.addDays(today, -rule.triggerOffsetDays);
      const targetDateStr = this.toDateStr(targetDate);
      const rows = await this.ruleRepo.manager.query(
        `SELECT c.id, c.phone, c.name, p.name AS extra
         FROM sales s
         JOIN contacts c ON s.contact_id = c.id
         JOIN products p ON s.product_id = p.id
         WHERE s.company_id = $1
           AND s.payment_status = 'pending'
           AND s.due_date = $2`,
        [companyId, targetDateStr],
      );
      rawContacts = rows;
    } else if (rule.type === AutomationTriggerType.REPURCHASE) {
      const targetDateStr = this.toDateStr(this.addDays(today, -rule.triggerOffsetDays));
      const rows = await this.ruleRepo.manager.query(
        `SELECT c.id, c.phone, c.name, p.id AS product_id, p.name AS extra
         FROM sales s
         JOIN contacts c ON s.contact_id = c.id
         JOIN products p ON s.product_id = p.id
         LEFT JOIN contact_product_settings cps
           ON cps.contact_id = s.contact_id AND cps.product_id = s.product_id AND cps.company_id = s.company_id
         WHERE s.company_id = $1
           AND (p.repurchase_interval_days IS NOT NULL OR cps.repurchase_interval_days IS NOT NULL)
         GROUP BY c.id, c.phone, c.name, p.id, p.name, cps.repurchase_interval_days, p.repurchase_interval_days
         HAVING (MAX(s.sale_date::date) + (COALESCE(cps.repurchase_interval_days, p.repurchase_interval_days) || ' days')::interval)::date = $2`,
        [companyId, targetDateStr],
      );
      rawContacts = rows;
    }

    const contacts = await Promise.all(
      rawContacts.map(async (c) => {
        let dedupeKey = '';
        if (rule.type === AutomationTriggerType.BIRTHDAY) dedupeKey = `birthday-${year}`;
        else if (rule.type === AutomationTriggerType.PAYMENT_OVERDUE) dedupeKey = `overdue-check-${todayStr}`;
        else dedupeKey = `repurchase-${(c as any).product_id ?? c.id}-${todayStr}`;

        const optedOut = await this.isOptedOut(c.id);
        const alreadySentFlag = !optedOut && await this.alreadySent(rule.id, c.id, dedupeKey);

        return {
          contactId: c.id,
          contactName: c.name,
          contactPhone: c.phone,
          extra: c.extra,
          status: (optedOut ? 'opted_out' : alreadySentFlag ? 'already_sent' : 'will_send') as
            'will_send' | 'already_sent' | 'opted_out',
        };
      }),
    );

    return {
      contacts,
      total: contacts.length,
      willSend: contacts.filter((c) => c.status === 'will_send').length,
    };
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

  private async isOptedOut(contactId: string): Promise<boolean> {
    const rows = await this.ruleRepo.manager.query(
      `SELECT automation_opt_out FROM contacts WHERE id = $1`,
      [contactId],
    );
    return rows?.[0]?.automation_opt_out === true;
  }

  private async sendAndRecord(
    rule: AutomationRule,
    contact: { id: string; phone: string; name: string },
    templateContext: Record<string, string>,
    dedupeKey: string,
  ): Promise<void> {
    // Check opt-out first
    if (await this.isOptedOut(contact.id)) return;

    if (await this.alreadySent(rule.id, contact.id, dedupeKey)) return;

    const isTemplate = rule.messageType === 'template';

    // Resolve message/vars before sending so we can store them regardless of success/failure
    const resolvedTemplateVariables = isTemplate && rule.templateVariables?.length
      ? rule.templateVariables.map((v) => this.resolveTemplate(v, templateContext))
      : null;

    const resolvedMessage = !isTemplate
      ? this.resolveTemplate(rule.messageTemplate ?? '', templateContext)
      : null;

    let status = AutomationExecutionStatus.SENT;
    let error: string | null = null;
    let conversationId: string | null = null;

    try {
      const result = await this.whatsappService.sendMessage(rule.companyId, {
        whatsappNumberId: rule.whatsappNumberId,
        to: contact.phone,
        type: isTemplate ? 'template' : 'text',
        message: isTemplate ? undefined : resolvedMessage ?? undefined,
        templateName: isTemplate ? rule.templateName ?? undefined : undefined,
        templateLanguage: isTemplate ? (rule.templateLanguage ?? 'pt_BR') : undefined,
        templateVariables: resolvedTemplateVariables ?? undefined,
      });
      conversationId = result?.conversationId ?? null;
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
        conversationId,
        resolvedMessage,
        resolvedTemplateVariables,
        status,
        error,
      }),
    );
  }

  /** Send directly with pre-resolved values (used for retry) */
  private async sendDirect(
    rule: AutomationRule,
    contact: { id: string; phone: string; name: string },
    resolvedMessage: string | null,
    resolvedTemplateVariables: string[] | null,
    dedupeKey: string,
  ): Promise<void> {
    const isTemplate = rule.messageType === 'template';

    let status = AutomationExecutionStatus.SENT;
    let error: string | null = null;
    let conversationId: string | null = null;

    try {
      const result = await this.whatsappService.sendMessage(rule.companyId, {
        whatsappNumberId: rule.whatsappNumberId,
        to: contact.phone,
        type: isTemplate ? 'template' : 'text',
        message: isTemplate ? undefined : resolvedMessage ?? undefined,
        templateName: isTemplate ? rule.templateName ?? undefined : undefined,
        templateLanguage: isTemplate ? (rule.templateLanguage ?? 'pt_BR') : undefined,
        templateVariables: resolvedTemplateVariables ?? undefined,
      });
      conversationId = result?.conversationId ?? null;
    } catch (err) {
      status = AutomationExecutionStatus.FAILED;
      error = err?.response?.data?.error?.message || err?.message || 'Erro desconhecido';
      this.logger.warn(`Retry automação ${rule.id} falhou para ${contact.phone}: ${error}`);
    }

    await this.execRepo.save(
      this.execRepo.create({
        companyId: rule.companyId,
        ruleId: rule.id,
        contactId: contact.id,
        dedupeKey,
        conversationId,
        resolvedMessage,
        resolvedTemplateVariables,
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
      const ctx = { nome: contact.name || '', primeiro_nome: firstName };
      await this.sendAndRecord(rule, contact, ctx, `birthday-${year}`);
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
      const ctx = {
        nome: row.name || '',
        primeiro_nome: firstName,
        produto: row.product_name || '',
        data_vencimento: dueDateFormatted,
        dias_atraso: String(row.dias_atraso || 0),
      };
      await this.sendAndRecord(rule, { id: row.id, phone: row.phone, name: row.name }, ctx, `overdue-${row.sale_id}`);
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
      const ctx = { nome: row.name || '', primeiro_nome: firstName, produto: row.product_name || '' };
      const dedupeKey = `repurchase-${row.product_id}-${today}`;
      await this.sendAndRecord(rule, { id: row.id, phone: row.phone, name: row.name }, ctx, dedupeKey);
    }
  }

  async getStats(ruleId: string, companyId: string): Promise<AutomationStats> {
    const rows = await this.ruleRepo.manager.query(
      `SELECT
        COUNT(*) FILTER (WHERE ae.status = 'sent') as sent,
        COUNT(*) FILTER (WHERE ae.status = 'failed') as failed,
        COUNT(*) FILTER (WHERE m.status IN ('delivered', 'read')) as delivered,
        COUNT(*) FILTER (WHERE m.status = 'read') as read_count,
        COUNT(*) FILTER (WHERE resp.id IS NOT NULL) as responded
      FROM automation_executions ae
      LEFT JOIN LATERAL (
        SELECT status FROM messages
        WHERE conversation_id = ae.conversation_id
          AND direction = 'outbound'
          AND created_at >= ae.created_at
        ORDER BY created_at ASC LIMIT 1
      ) m ON ae.conversation_id IS NOT NULL
      LEFT JOIN LATERAL (
        SELECT id FROM messages
        WHERE conversation_id = ae.conversation_id
          AND direction = 'inbound'
          AND created_at > ae.created_at
          AND created_at < ae.created_at + interval '48 hours'
        LIMIT 1
      ) resp ON ae.conversation_id IS NOT NULL
      WHERE ae.rule_id = $1 AND ae.company_id = $2`,
      [ruleId, companyId],
    );

    const row = rows[0] || {};
    return {
      sent: parseInt(row.sent) || 0,
      failed: parseInt(row.failed) || 0,
      delivered: parseInt(row.delivered) || 0,
      read: parseInt(row.read_count) || 0,
      responded: parseInt(row.responded) || 0,
    };
  }

  async getHistory(
    companyId: string,
    options: { ruleId?: string; status?: string; page: number; limit: number },
  ): Promise<PaginatedHistory> {
    const { ruleId, status, page, limit } = options;
    const offset = (page - 1) * limit;

    const whereClauses = [`ae.company_id = $1`];
    const params: any[] = [companyId];
    let idx = 2;

    if (ruleId) {
      whereClauses.push(`ae.rule_id = $${idx++}`);
      params.push(ruleId);
    }
    if (status) {
      whereClauses.push(`ae.status = $${idx++}`);
      params.push(status);
    }

    const whereStr = whereClauses.join(' AND ');

    const countRows = await this.ruleRepo.manager.query(
      `SELECT COUNT(*) as total FROM automation_executions ae WHERE ${whereStr}`,
      params,
    );
    const total = parseInt(countRows[0]?.total) || 0;

    const dataParams = [...params, limit, offset];
    const rows = await this.ruleRepo.manager.query(
      `SELECT
        ae.id,
        ae.company_id as "companyId",
        ae.rule_id as "ruleId",
        ar.name as "ruleName",
        ae.contact_id as "contactId",
        c.name as "contactName",
        c.phone as "contactPhone",
        ae.dedupe_key as "dedupeKey",
        ae.conversation_id as "conversationId",
        ae.resolved_message as "resolvedMessage",
        ae.status,
        ae.error,
        ae.created_at as "createdAt",
        m.status as "messageStatus",
        (resp.id IS NOT NULL) as responded
      FROM automation_executions ae
      LEFT JOIN automation_rules ar ON ar.id = ae.rule_id
      LEFT JOIN contacts c ON c.id = ae.contact_id
      LEFT JOIN LATERAL (
        SELECT status FROM messages
        WHERE conversation_id = ae.conversation_id
          AND direction = 'outbound'
          AND created_at >= ae.created_at
        ORDER BY created_at ASC LIMIT 1
      ) m ON ae.conversation_id IS NOT NULL
      LEFT JOIN LATERAL (
        SELECT id FROM messages
        WHERE conversation_id = ae.conversation_id
          AND direction = 'inbound'
          AND created_at > ae.created_at
          AND created_at < ae.created_at + interval '48 hours'
        LIMIT 1
      ) resp ON ae.conversation_id IS NOT NULL
      WHERE ${whereStr}
      ORDER BY ae.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}`,
      dataParams,
    );

    return {
      data: rows.map((r: any) => ({
        ...r,
        responded: r.responded === true || r.responded === 't' || r.responded === '1',
      })),
      total,
      page,
      limit,
    };
  }

  async getUpcoming(companyId: string, daysAhead = 7): Promise<UpcomingDispatch[]> {
    const result: UpcomingDispatch[] = [];
    const activeRules = await this.ruleRepo.find({ where: { companyId, isActive: true } });

    for (let d = 0; d <= daysAhead; d++) {
      const targetDate = this.addDays(new Date(), d);
      const dateStr = this.toDateStr(targetDate);

      for (const rule of activeRules) {
        let contacts: { id: string; name: string; phone: string }[] = [];

        if (rule.type === AutomationTriggerType.BIRTHDAY) {
          const effectiveDate = this.addDays(targetDate, rule.triggerOffsetDays);
          const month = effectiveDate.getMonth() + 1;
          const day = effectiveDate.getDate();
          contacts = await this.ruleRepo.manager.query(
            `SELECT id, phone, name FROM contacts
             WHERE company_id = $1
               AND birth_date IS NOT NULL
               AND EXTRACT(MONTH FROM birth_date::date) = $2
               AND EXTRACT(DAY FROM birth_date::date) = $3`,
            [companyId, month, day],
          );
        } else if (rule.type === AutomationTriggerType.PAYMENT_OVERDUE) {
          const effectiveDate = this.addDays(targetDate, -rule.triggerOffsetDays);
          const effectiveDateStr = this.toDateStr(effectiveDate);
          const sales = await this.ruleRepo.manager.query(
            `SELECT c.id, c.phone, c.name FROM sales s
             JOIN contacts c ON s.contact_id = c.id
             WHERE s.company_id = $1
               AND s.payment_status = 'pending'
               AND s.due_date = $2`,
            [companyId, effectiveDateStr],
          );
          contacts = sales;
        } else if (rule.type === AutomationTriggerType.REPURCHASE) {
          const effectiveDateStr = this.toDateStr(this.addDays(targetDate, -rule.triggerOffsetDays));
          const rows = await this.ruleRepo.manager.query(
            `SELECT c.id, c.phone, c.name, p.id AS product_id
             FROM sales s
             JOIN contacts c ON s.contact_id = c.id
             JOIN products p ON s.product_id = p.id
             LEFT JOIN contact_product_settings cps
               ON cps.contact_id = s.contact_id AND cps.product_id = s.product_id AND cps.company_id = s.company_id
             WHERE s.company_id = $1
               AND (p.repurchase_interval_days IS NOT NULL OR cps.repurchase_interval_days IS NOT NULL)
             GROUP BY c.id, c.phone, c.name, p.id, cps.repurchase_interval_days, p.repurchase_interval_days
             HAVING (MAX(s.sale_date::date) + (COALESCE(cps.repurchase_interval_days, p.repurchase_interval_days) || ' days')::interval)::date = $2`,
            [companyId, effectiveDateStr],
          );
          contacts = rows;
        }

        for (const contact of contacts) {
          const year = targetDate.getFullYear();
          let dedupeKey = '';
          if (rule.type === AutomationTriggerType.BIRTHDAY) {
            dedupeKey = `birthday-${year}`;
          } else if (rule.type === AutomationTriggerType.PAYMENT_OVERDUE) {
            dedupeKey = `overdue-check-${dateStr}`;
          } else {
            dedupeKey = `repurchase-${(contact as any).product_id || ''}-${dateStr}`;
          }

          const alreadySentFlag = await this.alreadySent(rule.id, contact.id, dedupeKey);
          const optedOut = await this.isOptedOut(contact.id);

          result.push({
            date: dateStr,
            rule: { id: rule.id, name: rule.name, type: rule.type },
            contact: { id: contact.id, name: contact.name, phone: contact.phone },
            wouldSkip: alreadySentFlag || optedOut,
          });
        }
      }
    }

    return result;
  }

  async retryExecution(id: string, companyId: string): Promise<void> {
    const execution = await this.execRepo.findOne({
      where: { id, companyId },
      relations: ['rule', 'contact'],
    });

    if (!execution) throw new NotFoundException('Execução não encontrada');
    if (execution.status !== AutomationExecutionStatus.FAILED) {
      throw new BadRequestException('Só é possível retentar execuções com falha');
    }

    const { rule, contact, resolvedMessage, resolvedTemplateVariables, dedupeKey } = execution;

    // Delete execution to remove deduplication lock
    await this.execRepo.remove(execution);

    // Re-send with already-resolved values
    await this.sendDirect(rule, contact, resolvedMessage, resolvedTemplateVariables, dedupeKey);
  }
}
