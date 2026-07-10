import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactProductSetting } from './contact-product-setting.entity';

@Injectable()
export class ContactProductSettingsService {
  constructor(
    @InjectRepository(ContactProductSetting)
    private readonly repo: Repository<ContactProductSetting>,
  ) {}

  findByContact(contactId: string, companyId: string): Promise<ContactProductSetting[]> {
    return this.repo.find({
      where: { contactId, companyId },
      relations: ['product'],
      order: { createdAt: 'ASC' },
    });
  }

  async upsert(
    contactId: string,
    productId: string,
    companyId: string,
    repurchaseIntervalDays: number,
  ): Promise<ContactProductSetting> {
    let setting = await this.repo.findOne({ where: { contactId, productId, companyId } });
    if (setting) {
      setting.repurchaseIntervalDays = repurchaseIntervalDays;
    } else {
      setting = this.repo.create({ contactId, productId, companyId, repurchaseIntervalDays });
    }
    return this.repo.save(setting);
  }

  async remove(contactId: string, productId: string, companyId: string): Promise<void> {
    const setting = await this.repo.findOne({ where: { contactId, productId, companyId } });
    if (!setting) throw new NotFoundException('Configuração não encontrada');
    await this.repo.remove(setting);
  }
}
