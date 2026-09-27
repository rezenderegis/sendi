import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FlowStep } from './flow-step.entity';
import { SaveFlowGraphDto } from './dto/flow-step.dto';

@Injectable()
export class FlowStepsService {
  constructor(
    @InjectRepository(FlowStep)
    private readonly repo: Repository<FlowStep>,
  ) {}

  findAllByFlow(flowId: string, companyId: string): Promise<FlowStep[]> {
    return this.repo.find({ where: { flowId, companyId }, order: { createdAt: 'ASC' } });
  }

  findById(companyId: string, id: string): Promise<FlowStep | null> {
    return this.repo.findOne({ where: { id, companyId } });
  }

  async saveGraph(flowId: string, companyId: string, dto: SaveFlowGraphDto): Promise<FlowStep[]> {
    if (dto.deletedIds?.length) {
      await this.repo.delete({ id: In(dto.deletedIds), companyId, flowId });
    }
    if (!dto.steps.length) return [];
    return this.repo.save(
      dto.steps.map((s) => this.repo.create({ ...s, companyId, flowId })),
    );
  }
}
