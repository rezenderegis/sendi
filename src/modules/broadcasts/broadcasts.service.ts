import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Broadcast, BroadcastStatus, BroadcastType } from './broadcast.entity';
import { BroadcastRecipient, RecipientStatus } from './broadcast-recipient.entity';
import { Conversation } from '../conversations/conversation.entity';
import { Message, MessageDirection } from '../conversations/message.entity';
import { CreateBroadcastDto, AddRecipientsDto, UpdateBroadcastDto } from './dto/create-broadcast.dto';
import { BroadcastMode } from './broadcast.entity';
import { parse } from 'csv-parse/sync';
import { normalizePhone } from '../../common/utils/phone.util';

export interface FailureRow {
  id: string;
  broadcastId: string;
  broadcastName: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class BroadcastsService {
  constructor(
    @InjectRepository(Broadcast)
    private readonly broadcastRepo: Repository<Broadcast>,
    @InjectRepository(BroadcastRecipient)
    private readonly recipientRepo: Repository<BroadcastRecipient>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectQueue('broadcast')
    private readonly broadcastQueue: Queue,
  ) {}

  async create(companyId: string, dto: CreateBroadcastDto): Promise<Broadcast> {
    if (dto.type === BroadcastType.TEXT && !dto.message) {
      throw new BadRequestException('message é obrigatório para broadcasts de texto');
    }
    if (dto.type === BroadcastType.TEMPLATE && !dto.templateName) {
      throw new BadRequestException('templateName é obrigatório para broadcasts de template');
    }
    return this.broadcastRepo.save(
      this.broadcastRepo.create({
        ...dto,
        companyId,
        templateLanguage: dto.templateLanguage || 'pt_BR',
      }),
    );
  }

  async findAll(companyId: string, allowedNumberIds?: string[] | null): Promise<Broadcast[]> {
    const qb = this.broadcastRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.tag', 'tag')
      .where('b.companyId = :companyId', { companyId })
      .orderBy('b.createdAt', 'DESC');

    if (allowedNumberIds?.length) {
      qb.andWhere('b.whatsappNumberId IN (:...allowedNumberIds)', { allowedNumberIds });
    }

    return qb.getMany();
  }

  async findById(id: string, companyId: string): Promise<Broadcast> {
    const broadcast = await this.broadcastRepo.findOne({ where: { id, companyId }, relations: ['tag', 'whatsappNumber'] });
    if (!broadcast) throw new NotFoundException('Broadcast não encontrado');
    return broadcast;
  }

  async update(id: string, companyId: string, dto: UpdateBroadcastDto): Promise<Broadcast> {
    const broadcast = await this.findById(id, companyId);
    if (broadcast.status !== BroadcastStatus.DRAFT) {
      throw new BadRequestException('Só é possível editar broadcasts com status draft');
    }
    Object.assign(broadcast, dto);
    return this.broadcastRepo.save(broadcast);
  }

  async addRecipients(
    id: string,
    companyId: string,
    dto: AddRecipientsDto,
  ): Promise<{ added: number; skipped: number }> {
    const broadcast = await this.findById(id, companyId);
    if (broadcast.status !== BroadcastStatus.DRAFT) {
      throw new BadRequestException('Só é possível adicionar destinatários em broadcasts com status draft');
    }

    let contactIds: string[] = [];

    if (dto.contactIds?.length) {
      contactIds = dto.contactIds;
    } else if (dto.tagId) {
      const [byConversationTag, byContactTag] = await Promise.all([
        this.conversationRepo
          .createQueryBuilder('c')
          .innerJoin('c.tags', 'tag')
          .where('c.companyId = :companyId', { companyId })
          .andWhere('tag.id = :tagId', { tagId: dto.tagId })
          .select('c.contactId', 'contactId')
          .getRawMany(),
        this.conversationRepo.manager
          .createQueryBuilder()
          .select('ct.contactId', 'contactId')
          .from('contact_tags', 'ct')
          .innerJoin('contacts', 'c', 'c.id = ct."contactId" AND c."companyId" = :companyId', { companyId })
          .where('ct."tagId" = :tagId', { tagId: dto.tagId })
          .getRawMany(),
      ]);
      const all = [...byConversationTag, ...byContactTag].map((r) => r.contactId);
      contactIds = [...new Set(all)];
    }

    if (!contactIds.length) {
      return { added: 0, skipped: 0 };
    }

    let added = 0;
    let skipped = 0;

    for (const contactId of contactIds) {
      const exists = await this.recipientRepo.findOne({
        where: { broadcastId: id, contactId },
      });
      if (exists) {
        skipped++;
        continue;
      }
      await this.recipientRepo.save(
        this.recipientRepo.create({ broadcastId: id, contactId }),
      );
      added++;
    }

    broadcast.totalCount = await this.recipientRepo.count({ where: { broadcastId: id } });
    if (dto.tagId) broadcast.tagId = dto.tagId;
    await this.broadcastRepo.save(broadcast);

    return { added, skipped };
  }

  async send(id: string, companyId: string): Promise<Broadcast> {
    const broadcast = await this.findById(id, companyId);
    if (broadcast.status !== BroadcastStatus.DRAFT) {
      throw new BadRequestException('Apenas broadcasts em draft podem ser enviados');
    }
    if (broadcast.totalCount === 0) {
      throw new BadRequestException('Adicione destinatários antes de enviar');
    }

    const recipients = await this.recipientRepo.find({
      where: { broadcastId: id, status: RecipientStatus.PENDING },
    });

    for (let i = 0; i < recipients.length; i++) {
      await this.broadcastQueue.add(
        'send-message',
        { broadcastId: id, recipientId: recipients[i].id },
        {
          delay: i * 1200,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );
    }

    broadcast.status = BroadcastStatus.QUEUED;
    return this.broadcastRepo.save(broadcast);
  }

  async pause(id: string, companyId: string): Promise<Broadcast> {
    const broadcast = await this.findById(id, companyId);
    if (
      broadcast.status !== BroadcastStatus.QUEUED &&
      broadcast.status !== BroadcastStatus.SENDING
    ) {
      throw new BadRequestException('Apenas broadcasts em andamento podem ser pausados');
    }
    broadcast.status = BroadcastStatus.PAUSED;
    return this.broadcastRepo.save(broadcast);
  }

  async listRecipients(id: string, companyId: string): Promise<BroadcastRecipient[]> {
    await this.findById(id, companyId);
    return this.recipientRepo.find({
      where: { broadcastId: id },
      relations: ['contact'],
      order: { createdAt: 'ASC' },
    });
  }

  async addRecipientsFromCsv(
    id: string,
    companyId: string,
    buffer: Buffer,
    broadcastType: string,
  ): Promise<{ added: number; skipped: number; errors: { row: number; phone: string; reason: string }[] }> {
    const broadcast = await this.findById(id, companyId);
    if (broadcast.status !== BroadcastStatus.DRAFT) {
      throw new BadRequestException('Só é possível adicionar destinatários em broadcasts com status draft');
    }

    const rawText = buffer.toString('utf8').replace(/^﻿/, '');
    const firstLine = rawText.split(/\r?\n/)[0] ?? '';
    const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

    // Detecta se tem cabeçalho: primeira célula parece número de telefone
    const firstCell = firstLine.split(delimiter)[0].trim();
    const hasHeader = !/^\d{8,}$/.test(firstCell);

    const columnNames = hasHeader
      ? true
      : broadcastType === 'template'
        ? ['telefone', 'nome', 'var1', 'var2', 'var3', 'var4', 'var5', 'var6']
        : ['telefone', 'nome', 'mensagem', 'var1', 'var2', 'var3', 'var4', 'var5'];

    const rows: Record<string, string>[] = parse(rawText, {
      columns: columnNames,
      skip_empty_lines: true,
      trim: true,
      delimiter,
      relax_column_count: true,
    });

    if (rows.length > 1000) {
      throw new BadRequestException('Máximo de 1.000 linhas por CSV');
    }

    const result = { added: 0, skipped: 0, errors: [] as { row: number; phone: string; reason: string }[] };

    for (let i = 0; i < rows.length; i++) {
      const raw = Object.fromEntries(Object.entries(rows[i]).map(([k, v]) => [k.toLowerCase().trim(), v]));
      const rawPhone = raw['telefone'] || raw['phone'];
      if (!rawPhone) {
        result.errors.push({ row: i + 2, phone: '', reason: 'Coluna telefone ausente' });
        continue;
      }

      const phone = normalizePhone(rawPhone.replace(/\D/g, ''));

      try {
        // Valida campos obrigatórios conforme tipo
        if (broadcastType === 'text') {
          const msg = raw['mensagem'] || raw['message'];
          if (!msg?.trim()) {
            result.errors.push({ row: i + 2, phone, reason: 'Coluna mensagem ausente ou vazia' });
            continue;
          }
        }

        // Cria ou atualiza contato
        let contact = await this.conversationRepo.manager
          .getRepository('Contact')
          .findOne({ where: { phone, companyId } }) as any;

        if (!contact) {
          // tenta formato alternativo
          const { phoneAlternative } = await import('../../common/utils/phone.util');
          const alt = phoneAlternative(phone);
          if (alt) {
            contact = await this.conversationRepo.manager
              .getRepository('Contact')
              .findOne({ where: { phone: alt, companyId } }) as any;
          }
        }

        const nome = raw['nome'] || raw['name'] || '';

        if (!contact) {
          contact = await this.conversationRepo.manager.getRepository('Contact').save(
            this.conversationRepo.manager.getRepository('Contact').create({
              phone,
              name: nome.trim() || phone,
              companyId,
            }),
          );
        } else if (nome.trim()) {
          await this.conversationRepo.manager
            .getRepository('Contact')
            .update({ id: contact.id }, { name: nome.trim() });
        }

        // Verifica duplicata
        const exists = await this.recipientRepo.findOne({ where: { broadcastId: id, contactId: contact.id } });
        if (exists) { result.skipped++; continue; }

        // Monta dados por tipo
        let customMessage: string | null = null;
        let templateVariables: string[] | null = null;

        if (broadcastType === 'text') {
          customMessage = (raw['mensagem'] || raw['message'] || '').trim();
        } else {
          // template: pega var1, var2, var3...
          const vars: string[] = [];
          let idx = 1;
          while (raw[`var${idx}`] !== undefined) {
            vars.push(raw[`var${idx}`]);
            idx++;
          }
          if (vars.length) templateVariables = vars;
        }

        await this.recipientRepo.save(
          this.recipientRepo.create({ broadcastId: id, contactId: contact.id, customMessage, templateVariables }),
        );
        result.added++;
      } catch (err) {
        result.errors.push({ row: i + 2, phone, reason: err.message });
      }
    }

    broadcast.totalCount = await this.recipientRepo.count({ where: { broadcastId: id } });
    broadcast.mode = BroadcastMode.CSV;
    await this.broadcastRepo.save(broadcast);

    return result;
  }

  async listFailures(companyId: string, broadcastId?: string): Promise<FailureRow[]> {
    const qb = this.recipientRepo
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.contact', 'contact')
      .innerJoinAndSelect('r.broadcast', 'broadcast')
      .where('broadcast.companyId = :companyId', { companyId })
      .andWhere('r.status = :status', { status: RecipientStatus.FAILED })
      .orderBy('r.createdAt', 'DESC');

    if (broadcastId) {
      qb.andWhere('r.broadcastId = :broadcastId', { broadcastId });
    }

    const rows = await qb.getMany();
    return rows.map((r) => ({
      id: r.id,
      broadcastId: r.broadcastId,
      broadcastName: r.broadcast.name,
      contactId: r.contactId,
      contactName: r.contact.name,
      contactPhone: r.contact.phone,
      error: r.error,
      sentAt: r.sentAt,
      createdAt: r.createdAt,
    }));
  }

  async getResponses(id: string, companyId: string) {
    const broadcast = await this.findById(id, companyId);

    const sentRecipients = await this.recipientRepo.find({
      where: { broadcastId: id, status: RecipientStatus.SENT },
      relations: ['contact'],
      order: { sentAt: 'ASC' },
    });

    const responses: any[] = [];
    const noResponse: any[] = [];

    await Promise.all(
      sentRecipients.map(async (r) => {
        // Busca todas as conversas do contato para este número — pode haver mais de uma (aberta + fechadas antigas)
        const conversations = await this.conversationRepo.find({
          where: {
            companyId: broadcast.companyId,
            whatsappNumberId: broadcast.whatsappNumberId,
            contactId: r.contactId,
          },
          order: { lastMessageAt: 'DESC' },
        });

        const afterSentAt = r.sentAt ? new Date(r.sentAt) : new Date(0);

        // Agrega mensagens inbound de todas as conversas após o envio
        const inboundMessages =
          conversations.length > 0
            ? await this.messageRepo
                .createQueryBuilder('m')
                .where('m."conversationId" IN (:...ids)', {
                  ids: conversations.map((c) => c.id),
                })
                .andWhere('m.direction = :direction', { direction: MessageDirection.INBOUND })
                .andWhere('m."createdAt" > :after', { after: afterSentAt })
                .orderBy('m."createdAt"', 'ASC')
                .getMany()
            : [];

        // Conversa principal = a mais recente (onde está a última mensagem)
        const mainConversation = conversations[0] ?? null;

        if (inboundMessages.length === 0) {
          noResponse.push({
            recipientId: r.id,
            contactId: r.contactId,
            contactName: r.contact.name,
            contactPhone: r.contact.phone,
            sentAt: r.sentAt,
            conversationId: mainConversation?.id ?? null,
            conversationStatus: mainConversation?.status ?? null,
          });
        } else {
          const firstMsg = inboundMessages[0];
          const respondedAt = r.respondedAt ?? firstMsg.createdAt;
          const responseTimeMinutes = r.sentAt
            ? Math.floor(
                (new Date(respondedAt).getTime() - new Date(r.sentAt).getTime()) / 60000,
              )
            : null;

          responses.push({
            recipientId: r.id,
            contactId: r.contactId,
            contactName: r.contact.name,
            contactPhone: r.contact.phone,
            sentAt: r.sentAt,
            respondedAt,
            responseTimeMinutes,
            conversationId: mainConversation?.id ?? null,
            conversationStatus: mainConversation?.status ?? null,
            sentiment: r.responseSentiment,
            messages: inboundMessages.slice(0, 5).map((m) => ({
              content: m.content,
              createdAt: m.createdAt,
            })),
          });
        }
      }),
    );

    responses.sort(
      (a, b) => new Date(a.respondedAt).getTime() - new Date(b.respondedAt).getTime(),
    );

    const withTime = responses.filter((r) => r.responseTimeMinutes !== null);
    const avgResponseMinutes =
      withTime.length > 0
        ? Math.round(withTime.reduce((s, r) => s + r.responseTimeMinutes, 0) / withTime.length)
        : null;

    return {
      stats: {
        total: broadcast.totalCount,
        sent: broadcast.sentCount,
        failed: broadcast.failedCount,
        responded: responses.length,
        responseRate:
          sentRecipients.length > 0
            ? Math.round((responses.length / sentRecipients.length) * 100)
            : 0,
        avgResponseMinutes,
        sentiment: {
          positive: responses.filter((r) => r.sentiment === 'positive').length,
          negative: responses.filter((r) => r.sentiment === 'negative').length,
          neutral: responses.filter((r) => r.sentiment === 'neutral').length,
        },
      },
      responses,
      noResponse,
    };
  }
}
