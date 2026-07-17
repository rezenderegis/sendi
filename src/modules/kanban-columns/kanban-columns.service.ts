import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KanbanColumn } from './kanban-column.entity';

@Injectable()
export class KanbanColumnsService {
  constructor(
    @InjectRepository(KanbanColumn)
    private readonly repo: Repository<KanbanColumn>,
  ) {}

  findAll(companyId: string): Promise<KanbanColumn[]> {
    return this.repo.find({
      where: { companyId },
      order: { position: 'ASC' },
    });
  }

  async create(companyId: string, name: string, color: string): Promise<KanbanColumn> {
    const count = await this.repo.count({ where: { companyId } });
    return this.repo.save(this.repo.create({ companyId, name, color, position: count }));
  }

  async update(id: string, companyId: string, data: Partial<Pick<KanbanColumn, 'name' | 'color' | 'position'>>): Promise<KanbanColumn> {
    const col = await this.repo.findOne({ where: { id, companyId } });
    if (!col) throw new NotFoundException('Coluna não encontrada');
    Object.assign(col, data);
    return this.repo.save(col);
  }

  async reorder(companyId: string, orderedIds: string[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.repo.update({ id, companyId }, { position: index }),
      ),
    );
  }

  async remove(id: string, companyId: string): Promise<void> {
    const col = await this.repo.findOne({ where: { id, companyId } });
    if (!col) throw new NotFoundException('Coluna não encontrada');
    await this.repo.remove(col);
  }
}
