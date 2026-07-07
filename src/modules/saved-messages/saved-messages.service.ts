import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedMessage } from './saved-message.entity';
import { CreateSavedMessageDto, UpdateSavedMessageDto } from './dto/create-saved-message.dto';

@Injectable()
export class SavedMessagesService {
  constructor(
    @InjectRepository(SavedMessage)
    private readonly repo: Repository<SavedMessage>,
  ) {}

  findAll(companyId: string): Promise<SavedMessage[]> {
    return this.repo.find({ where: { companyId }, order: { name: 'ASC' } });
  }

  create(companyId: string, dto: CreateSavedMessageDto): Promise<SavedMessage> {
    return this.repo.save(this.repo.create({ ...dto, companyId }));
  }

  async update(id: string, companyId: string, dto: UpdateSavedMessageDto): Promise<SavedMessage> {
    const msg = await this.repo.findOne({ where: { id, companyId } });
    if (!msg) throw new NotFoundException('Mensagem salva não encontrada');
    Object.assign(msg, dto);
    return this.repo.save(msg);
  }

  async delete(id: string, companyId: string): Promise<void> {
    const msg = await this.repo.findOne({ where: { id, companyId } });
    if (!msg) throw new NotFoundException('Mensagem salva não encontrada');
    await this.repo.remove(msg);
  }
}
