import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './contact.entity';
import { CreateContactDto, UpdateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  async findAll(companyId: string): Promise<Contact[]> {
    return this.contactRepository.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
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

  async findOrCreateByPhone(
    phone: string,
    companyId: string,
    name?: string,
  ): Promise<Contact> {
    let contact = await this.contactRepository.findOne({
      where: { phone, companyId },
    });

    if (!contact) {
      contact = this.contactRepository.create({
        phone,
        name: name || phone,
        companyId,
      });
      contact = await this.contactRepository.save(contact);
    }

    return contact;
  }

  async create(companyId: string, dto: CreateContactDto): Promise<Contact> {
    const contact = this.contactRepository.create({ ...dto, companyId });
    return this.contactRepository.save(contact);
  }

  async update(id: string, companyId: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.findById(id, companyId);
    Object.assign(contact, dto);
    return this.contactRepository.save(contact);
  }
}
