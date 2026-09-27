import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flow } from './flow.entity';
import { CreateFlowDto, UpdateFlowDto } from './dto/flow.dto';

@Injectable()
export class FlowsService {
  constructor(
    @InjectRepository(Flow)
    private readonly repo: Repository<Flow>,
  ) {}

  findAll(companyId: string): Promise<Flow[]> {
    return this.repo.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  async findById(companyId: string, id: string): Promise<Flow> {
    const flow = await this.repo.findOne({ where: { id, companyId } });
    if (!flow) throw new NotFoundException('Fluxo não encontrado');
    return flow;
  }

  async create(companyId: string, dto: CreateFlowDto): Promise<Flow> {
    return this.repo.save(this.repo.create({ ...dto, companyId }));
  }

  async update(id: string, companyId: string, dto: UpdateFlowDto): Promise<Flow> {
    const flow = await this.findById(companyId, id);
    Object.assign(flow, dto);
    return this.repo.save(flow);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const flow = await this.findById(companyId, id);
    await this.repo.remove(flow);
  }
}
