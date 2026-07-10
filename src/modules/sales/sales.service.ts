import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale, PaymentStatus } from './sale.entity';
import { CreateSaleDto, UpdateSaleDto } from './dto/create-sale.dto';
import { ContactsService } from '../contacts/contacts.service';
import { ProductsService } from '../products/products.service';
import { normalizePhone } from '../../common/utils/phone.util';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

export interface SaleImportResult {
  created: number;
  updated: number;
  failed: number;
  errors: { row: number; externalId: string; reason: string }[];
}

const SALE_COLUMN_MAP: Record<string, string> = {
  id_externo: 'externalId', idexterno: 'externalId', external_id: 'externalId', externalid: 'externalId',
  telefone: 'phone', phone: 'phone', celular: 'phone', whatsapp: 'phone',
  produto: 'productName', product: 'productName',
  data_venda: 'saleDate', datasale: 'saleDate', saledate: 'saleDate', data: 'saleDate',
  quantidade: 'quantity', quantity: 'quantity', qtd: 'quantity', qty: 'quantity',
  valor_unitario: 'unitPrice', valorunitario: 'unitPrice', unitprice: 'unitPrice', preco: 'unitPrice', preço: 'unitPrice',
  valor_total: 'totalValue', valortotal: 'totalValue', totalvalue: 'totalValue', total: 'totalValue',
  status: 'paymentStatus', pagamento: 'paymentStatus', payment_status: 'paymentStatus',
  data_vencimento: 'dueDate', datavencimento: 'dueDate', duedate: 'dueDate', vencimento: 'dueDate',
  observacao: 'notes', observação: 'notes', notes: 'notes', obs: 'notes',
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_');
}

function parseStatus(raw: string): PaymentStatus {
  const v = raw.toLowerCase().trim();
  if (v === 'pago' || v === 'paid') return PaymentStatus.PAID;
  return PaymentStatus.PENDING;
}

function isSpreadsheet(mimetype: string, filename?: string): boolean {
  return (
    mimetype.includes('spreadsheetml') ||
    mimetype.includes('ms-excel') ||
    (filename?.endsWith('.xlsx') ?? false) ||
    (filename?.endsWith('.xls') ?? false)
  );
}

function parseRows(buffer: Buffer, mimetype: string, filename?: string): Record<string, string>[] {
  if (isSpreadsheet(mimetype, filename)) {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: '' });
  }
  return parse(buffer, { columns: true, skip_empty_lines: true, trim: true, delimiter: ';' });
}

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    private readonly contactsService: ContactsService,
    private readonly productsService: ProductsService,
  ) {}

  findAll(companyId: string, filters?: {
    contactId?: string;
    productId?: string;
    paymentStatus?: PaymentStatus;
    startDate?: string;
    endDate?: string;
  }): Promise<Sale[]> {
    const qb = this.saleRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.contact', 'contact')
      .leftJoinAndSelect('s.product', 'product')
      .where('s.companyId = :companyId', { companyId })
      .orderBy('s.saleDate', 'DESC')
      .addOrderBy('s.createdAt', 'DESC');

    if (filters?.contactId) qb.andWhere('s.contactId = :contactId', { contactId: filters.contactId });
    if (filters?.productId) qb.andWhere('s.productId = :productId', { productId: filters.productId });
    if (filters?.paymentStatus) qb.andWhere('s.paymentStatus = :paymentStatus', { paymentStatus: filters.paymentStatus });
    if (filters?.startDate) qb.andWhere('s.saleDate >= :startDate', { startDate: filters.startDate });
    if (filters?.endDate) qb.andWhere('s.saleDate <= :endDate', { endDate: filters.endDate });

    return qb.getMany();
  }

  async findOne(id: string, companyId: string): Promise<Sale> {
    const sale = await this.saleRepo.findOne({
      where: { id, companyId },
      relations: ['contact', 'product'],
    });
    if (!sale) throw new NotFoundException('Venda não encontrada');
    return sale;
  }

  async findByContact(contactId: string, companyId: string): Promise<Sale[]> {
    return this.saleRepo.find({
      where: { contactId, companyId },
      relations: ['product'],
      order: { saleDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async create(companyId: string, dto: CreateSaleDto): Promise<Sale> {
    const sale = this.saleRepo.create({
      ...dto,
      quantity: dto.quantity ?? 1,
      paymentStatus: dto.paymentStatus ?? PaymentStatus.PENDING,
      companyId,
    });
    return this.saleRepo.save(sale);
  }

  async update(id: string, companyId: string, dto: UpdateSaleDto): Promise<Sale> {
    const sale = await this.findOne(id, companyId);
    Object.assign(sale, dto);
    return this.saleRepo.save(sale);
  }

  async markAsPaid(id: string, companyId: string): Promise<Sale> {
    const sale = await this.findOne(id, companyId);
    sale.paymentStatus = PaymentStatus.PAID;
    return this.saleRepo.save(sale);
  }

  async delete(id: string, companyId: string): Promise<void> {
    const sale = await this.findOne(id, companyId);
    await this.saleRepo.remove(sale);
  }

  async importFromFile(
    buffer: Buffer,
    mimetype: string,
    filename: string,
    companyId: string,
  ): Promise<SaleImportResult> {
    const rawRows = parseRows(buffer, mimetype, filename);
    const result: SaleImportResult = { created: 0, updated: 0, failed: 0, errors: [] };

    if (!rawRows.length) return result;

    const headers = Object.keys(rawRows[0]);
    const headerMapping: Record<string, string> = {};
    for (const h of headers) {
      const mapped = SALE_COLUMN_MAP[normalizeHeader(h)];
      if (mapped) headerMapping[h] = mapped;
    }

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const row: Record<string, string> = {};
      for (const [original, field] of Object.entries(headerMapping)) {
        const val = raw[original];
        if (val !== undefined && String(val).trim() !== '') row[field] = String(val).trim();
      }

      const rowLabel = row['externalId'] || `linha ${i + 2}`;

      try {
        // Resolve contato pelo telefone
        const rawPhone = row['phone'];
        if (!rawPhone) throw new Error('Telefone obrigatório');
        const contact = await this.contactsService.findOrCreateByPhone(
          normalizePhone(rawPhone),
          companyId,
        );

        // Resolve produto pelo nome
        const productName = row['productName'];
        if (!productName) throw new Error('Produto obrigatório');
        const product = await this.productsService.findOrCreateByName(productName, companyId);

        // Upsert por externalId
        const externalId = row['externalId'] || null;
        let sale: Sale | null = null;
        if (externalId) {
          sale = await this.saleRepo.findOne({ where: { externalId, companyId } });
        }

        const saleDate = row['saleDate'] || new Date().toISOString().slice(0, 10);
        const unitPrice = parseFloat(row['unitPrice']?.replace(',', '.') || '0');
        const totalValue = parseFloat(row['totalValue']?.replace(',', '.') || '0') || unitPrice * parseInt(row['quantity'] || '1');
        const quantity = parseInt(row['quantity'] || '1');
        const paymentStatus = row['paymentStatus'] ? parseStatus(row['paymentStatus']) : PaymentStatus.PENDING;
        const dueDate = row['dueDate'] || null;
        const notes = row['notes'] || null;

        if (sale) {
          Object.assign(sale, { saleDate, quantity, unitPrice, totalValue, paymentStatus, dueDate, notes, contactId: contact.id, productId: product.id });
          await this.saleRepo.save(sale);
          result.updated++;
        } else {
          await this.saleRepo.save(this.saleRepo.create({
            externalId,
            companyId,
            contactId: contact.id,
            productId: product.id,
            saleDate,
            quantity,
            unitPrice,
            totalValue,
            paymentStatus,
            dueDate,
            notes,
          }));
          result.created++;
        }
      } catch (err) {
        result.failed++;
        result.errors.push({ row: i + 2, externalId: rowLabel, reason: err.message });
      }
    }

    return result;
  }
}
