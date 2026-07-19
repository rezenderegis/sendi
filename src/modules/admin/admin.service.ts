import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../companies/company.entity';
import { WhatsappNumber } from '../whatsapp/whatsapp-number.entity';
import { UsageService } from '../billing/usage.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CreditBalanceDto, SetNumberLimitsDto, UpdatePlatformSettingsDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(WhatsappNumber)
    private readonly numberRepo: Repository<WhatsappNumber>,
    private readonly usageService: UsageService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async listCompanies() {
    const companies = await this.companyRepo.find({ order: { name: 'ASC' } });
    return Promise.all(
      companies.map(async (company) => {
        const summary = await this.usageService.getUsageSummary(company.id);
        return {
          id: company.id,
          name: company.name,
          email: company.email,
          plan: company.plan,
          isActive: company.isActive,
          ...summary,
        };
      }),
    );
  }

  getSettings() {
    return this.usageService.getSettings();
  }

  updateSettings(dto: UpdatePlatformSettingsDto) {
    return this.usageService.updateSettings(dto);
  }

  async creditBalance(companyId: string, dto: CreditBalanceDto, adminUserId: string) {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    return this.usageService.creditBalance(companyId, dto.amountCents, dto.reason ?? null, adminUserId);
  }

  async getBalanceHistory(companyId: string) {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    return this.usageService.getBalanceHistory(companyId);
  }

  async setNumberLimits(numberId: string, dto: SetNumberLimitsDto) {
    const number = await this.numberRepo.findOne({ where: { id: numberId } });
    if (!number) throw new NotFoundException('Número WhatsApp não encontrado');
    if (dto.dailySpendLimitCents !== undefined) number.dailySpendLimitCents = dto.dailySpendLimitCents;
    if (dto.monthlySpendLimitCents !== undefined) number.monthlySpendLimitCents = dto.monthlySpendLimitCents;
    return this.numberRepo.save(number);
  }

  async getReconciliation(numberId: string, since: Date, until: Date) {
    const number = await this.numberRepo.findOne({ where: { id: numberId } });
    if (!number) throw new NotFoundException('Número WhatsApp não encontrado');

    const [meta, internal] = await Promise.all([
      this.whatsappService.getConversationAnalytics(numberId, number.companyId, since, until),
      this.usageService.getInternalSpendForNumber(numberId, since, until),
    ]);

    return {
      whatsappNumberId: numberId,
      displayName: number.displayName,
      since: since.toISOString(),
      until: until.toISOString(),
      meta,
      internal: {
        costCents: internal.totalCostCents,
        outboundCount: internal.outboundCount,
        botCount: internal.botCount,
      },
      deltaCents: meta.totalCostCents - internal.totalCostCents,
    };
  }
}
