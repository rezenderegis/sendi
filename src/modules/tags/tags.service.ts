import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  findAll(companyId: string): Promise<Tag[]> {
    return this.tagRepository.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async create(companyId: string, dto: CreateTagDto): Promise<Tag> {
    const existing = await this.tagRepository.findOne({
      where: { companyId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Tag com este nome já existe para esta empresa');
    }

    const tag = this.tagRepository.create({ ...dto, companyId });
    return this.tagRepository.save(tag);
  }

  async delete(id: string, companyId: string): Promise<void> {
    const tag = await this.tagRepository.findOne({ where: { id, companyId } });
    if (!tag) {
      throw new NotFoundException('Tag não encontrada');
    }
    await this.tagRepository.remove(tag);
  }
}
