import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './contact.entity';
import { CreateContactDto, UpdateContactDto } from './dto/create-contact.dto';
import { Tag } from '../tags/tag.entity';

const TAG_COLUMNS = ['tag', 'tags', 'etiqueta', 'etiquetas'];
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { normalizePhone, phoneAlternative } from '../../common/utils/phone.util';

const COLUMN_MAP: Record<string, string> = {
  nome: 'name', name: 'name',
  telefone: 'phone', phone: 'phone', celular: 'phone', whatsapp: 'phone', fone: 'phone',
  email: 'email',
  empresa: 'companyName', company: 'companyName', companyname: 'companyName',
  notas: 'notes', notes: 'notes', observacoes: 'notes', observações: 'notes',
  externalid: 'externalId', id_externo: 'externalId', external_id: 'externalId', codigo: 'externalId', código: 'externalId',
  tag: 'tag', tags: 'tag', etiqueta: 'tag', etiquetas: 'tag',
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');
}

function isSpreadsheet(mimetype: string, filename?: string): boolean {
  return (
    mimetype.includes('spreadsheetml') ||
    mimetype.includes('ms-excel') ||
    filename?.endsWith('.xlsx') ||
    filename?.endsWith('.xls')
  );
}

function parseRows(buffer: Buffer, mimetype: string, filename?: string): Record<string, string>[] {
  if (isSpreadsheet(mimetype, filename)) {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: '' });
  }
  return parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
}

export interface ImportResult {
  created: number;
  updated: number;
  failed: number;
  errors: { row: number; phone: string; reason: string }[];
}

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  async findAll(
    companyId: string,
    broadcastId?: string,
    broadcastResponseFilter?: string,
  ): Promise<Contact[]> {
    const qb = this.contactRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.tags', 'tags')
      .where('c.companyId = :companyId', { companyId })
      .orderBy('c.name', 'ASC');

    if (broadcastId) {
      let condition = `br."broadcastId" = :broadcastId`;
      if (broadcastResponseFilter === 'responded') {
        condition += ` AND br."respondedAt" IS NOT NULL`;
      } else if (broadcastResponseFilter === 'no_response') {
        condition += ` AND br.status = 'sent' AND br."respondedAt" IS NULL`;
      } else if (broadcastResponseFilter === 'failed') {
        condition += ` AND br.status = 'failed'`;
      }
      qb.andWhere(
        `c.id IN (SELECT br."contactId" FROM broadcast_recipients br WHERE ${condition})`,
        { broadcastId },
      );
    }

    return qb.getMany();
  }

  async findById(id: string, companyId: string): Promise<Contact> {
    const contact = await this.contactRepository.findOne({
      where: { id, companyId },
    });
    if (!contact) {
      throw new NotFoundException('Contato não encontrado');
    }
    return contact;
  }

  async findByPhone(phone: string, companyId: string): Promise<Contact | null> {
    const normalized = normalizePhone(phone);
    let contact = await this.contactRepository.findOne({ where: { phone: normalized, companyId } });
    if (!contact) {
      const alt = phoneAlternative(normalized);
      if (alt) {
        contact = await this.contactRepository.findOne({ where: { phone: alt, companyId } });
      }
    }
    return contact ?? null;
  }

  async findOrCreateByPhone(
    phone: string,
    companyId: string,
    whatsappName?: string,
  ): Promise<Contact> {
    const normalized = normalizePhone(phone);

    let contact = await this.contactRepository.findOne({
      where: { phone: normalized, companyId },
    });

    // Fallback: tenta o formato alternativo (com/sem 9º dígito) caso o contato tenha sido
    // criado antes da normalização ou com o formato diferente do webhook
    if (!contact) {
      const alt = phoneAlternative(normalized);
      if (alt) {
        contact = await this.contactRepository.findOne({ where: { phone: alt, companyId } });
      }
    }

    if (!contact) {
      contact = this.contactRepository.create({
        phone: normalized,
        name: whatsappName || normalized,
        whatsappName: whatsappName || null,
        companyId,
      });
      return this.contactRepository.save(contact);
    }

    // Atualiza o whatsappName se mudou, sem sobrescrever o name personalizado
    if (whatsappName && contact.whatsappName !== whatsappName) {
      contact.whatsappName = whatsappName;
      return this.contactRepository.save(contact);
    }

    return contact;
  }

  async create(companyId: string, dto: CreateContactDto): Promise<Contact> {
    const contact = this.contactRepository.create({
      ...dto,
      phone: normalizePhone(dto.phone),
      companyId,
    });
    return this.contactRepository.save(contact);
  }

  async update(id: string, companyId: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.findById(id, companyId);
    Object.assign(contact, dto);
    return this.contactRepository.save(contact);
  }

  private async findOrCreateTags(names: string[], companyId: string): Promise<Tag[]> {
    const tags: Tag[] = [];
    for (const name of names) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      let tag = await this.tagRepository.findOne({ where: { name: trimmed, companyId } });
      if (!tag) {
        const colors = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#8b5cf6','#ec4899','#6b7280'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        tag = await this.tagRepository.save(this.tagRepository.create({ name: trimmed, color, companyId }));
      }
      tags.push(tag);
    }
    return tags;
  }

  async findByTag(tagId: string, companyId: string): Promise<Contact[]> {
    const [byContactTag, byConversationTag] = await Promise.all([
      // Contatos marcados diretamente via contact_tags
      this.contactRepository
        .createQueryBuilder('c')
        .innerJoin('c.tags', 'tag')
        .leftJoinAndSelect('c.tags', 'tags')
        .where('c.companyId = :companyId', { companyId })
        .andWhere('tag.id = :tagId', { tagId })
        .getMany(),
      // Contatos cujas conversas têm esta tag via conversation_tags
      this.contactRepository
        .createQueryBuilder('c')
        .innerJoin(
          'conversations',
          'conv',
          'conv."contactId" = c.id AND conv."companyId" = :companyId',
          { companyId },
        )
        .innerJoin(
          'conversation_tags',
          'ct',
          'ct."conversationId" = conv.id AND ct."tagId" = :tagId',
          { tagId },
        )
        .leftJoinAndSelect('c.tags', 'tags')
        .where('c.companyId = :companyId', { companyId })
        .getMany(),
    ]);

    const seen = new Set<string>();
    const result: Contact[] = [];
    for (const c of [...byContactTag, ...byConversationTag]) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        result.push(c);
      }
    }
    result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return result;
  }

  async updatePhone(id: string, companyId: string, phone: string): Promise<void> {
    await this.contactRepository.update({ id, companyId }, { phone });
  }

  async setAutomationOptOut(id: string, companyId: string, optOut: boolean): Promise<void> {
    const contact = await this.findById(id, companyId);
    contact.automationOptOut = optOut;
    await this.contactRepository.save(contact);
  }

  async delete(id: string, companyId: string): Promise<void> {
    const contact = await this.findById(id, companyId);
    await this.contactRepository.remove(contact);
  }

  async addTag(contactId: string, companyId: string, tagId: string): Promise<void> {
    const contact = await this.contactRepository.findOne({ where: { id: contactId, companyId } });
    if (!contact) throw new NotFoundException('Contato não encontrado');
    const tag = await this.tagRepository.findOne({ where: { id: tagId, companyId } });
    if (!tag) throw new NotFoundException('Tag não encontrada');
    await this.contactRepository
      .createQueryBuilder()
      .relation(Contact, 'tags')
      .of(contactId)
      .add(tagId);
  }

  async removeTag(contactId: string, companyId: string, tagId: string): Promise<void> {
    await this.contactRepository
      .createQueryBuilder()
      .relation(Contact, 'tags')
      .of(contactId)
      .remove(tagId);
  }

  async importFromFile(
    buffer: Buffer,
    mimetype: string,
    filename: string,
    companyId: string,
    globalTagName?: string,
  ): Promise<ImportResult> {
    const rawRows = parseRows(buffer, mimetype, filename);
    const result: ImportResult = { created: 0, updated: 0, failed: 0, errors: [] };

    if (!rawRows.length) return result;

    const headers = Object.keys(rawRows[0]);
    const headerMapping: Record<string, string> = {};
    for (const h of headers) {
      const mapped = COLUMN_MAP[normalizeHeader(h)];
      if (mapped) headerMapping[h] = mapped;
    }

    const hasTagColumn = headers.some((h) => TAG_COLUMNS.includes(normalizeHeader(h)));

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const row: Record<string, string> = {};
      for (const [original, field] of Object.entries(headerMapping)) {
        const val = raw[original];
        if (val !== undefined && val !== '') row[field] = String(val).trim();
      }

      const rawPhone = row['phone'];
      if (!rawPhone) {
        result.failed++;
        result.errors.push({ row: i + 2, phone: '', reason: 'Telefone obrigatório' });
        continue;
      }

      const phone = normalizePhone(rawPhone);
      try {
        // Resolve tags da linha
        const tagNames: string[] = [];
        if (hasTagColumn && row['tag']) {
          tagNames.push(...row['tag'].split(',').map((t) => t.trim()).filter(Boolean));
        }
        if (globalTagName?.trim()) {
          tagNames.push(globalTagName.trim());
        }
        const tags = tagNames.length ? await this.findOrCreateTags([...new Set(tagNames)], companyId) : [];

        const alt = phoneAlternative(phone);
        let contact = await this.contactRepository.findOne({ where: { phone, companyId } });
        if (!contact && alt) {
          contact = await this.contactRepository.findOne({ where: { phone: alt, companyId } });
          if (contact) contact.phone = phone; // migra para formato com 9
        }
        if (contact) {
          if (row['name']) contact.name = row['name'];
          if ('email' in row) contact.email = row['email'] || null;
          if ('companyName' in row) contact.companyName = row['companyName'] || null;
          if ('notes' in row) contact.notes = row['notes'] || null;
          if ('externalId' in row) contact.externalId = row['externalId'] || null;
          await this.contactRepository.save(contact);
          result.updated++;
        } else {
          contact = await this.contactRepository.save(
            this.contactRepository.create({
              phone,
              name: row['name'] || phone,
              email: row['email'] || null,
              companyName: row['companyName'] || null,
              notes: row['notes'] || null,
              externalId: row['externalId'] || null,
              companyId,
            }),
          );
          result.created++;
        }

        // Associa tags
        for (const tag of tags) {
          await this.contactRepository
            .createQueryBuilder()
            .relation(Contact, 'tags')
            .of(contact.id)
            .add(tag.id)
            .catch(() => {}); // ignora duplicatas
        }
      } catch (err) {
        result.failed++;
        result.errors.push({ row: i + 2, phone, reason: err.message });
      }
    }

    return result;
  }
}
