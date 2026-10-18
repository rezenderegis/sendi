import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityType } from './activity-type.entity';
import { ProductivityGoal } from './productivity-goal.entity';
import { FollowOn } from '../follow-ons/follow-on.entity';

@Injectable()
export class ActivityTypesService {
  constructor(
    @InjectRepository(ActivityType)
    private readonly repo: Repository<ActivityType>,
    @InjectRepository(ProductivityGoal)
    private readonly goalRepository: Repository<ProductivityGoal>,
    @InjectRepository(FollowOn)
    private readonly followOnRepository: Repository<FollowOn>,
  ) {}

  findAll(companyId: string): Promise<ActivityType[]> {
    return this.repo.find({ where: { companyId }, order: { createdAt: 'ASC' } });
  }

  async create(companyId: string, name: string): Promise<ActivityType> {
    return this.repo.save(this.repo.create({ companyId, name }));
  }

  private async findOr404(id: string, companyId: string): Promise<ActivityType> {
    const activityType = await this.repo.findOne({ where: { id, companyId } });
    if (!activityType) throw new NotFoundException('Tipo de atividade não encontrado');
    return activityType;
  }

  async update(id: string, companyId: string, dto: { name?: string; isActive?: boolean }): Promise<ActivityType> {
    const activityType = await this.findOr404(id, companyId);
    if (dto.name !== undefined) activityType.name = dto.name;
    if (dto.isActive !== undefined) activityType.isActive = dto.isActive;
    return this.repo.save(activityType);
  }

  private async isInUse(id: string, companyId: string): Promise<boolean> {
    const [goalCount, followOnCount] = await Promise.all([
      this.goalRepository.count({ where: { activityTypeId: id, companyId } }),
      this.followOnRepository.count({ where: { activityTypeId: id, companyId } }),
    ]);
    return goalCount > 0 || followOnCount > 0;
  }

  async remove(id: string, companyId: string): Promise<void> {
    const activityType = await this.findOr404(id, companyId);
    if (await this.isInUse(id, companyId)) {
      throw new BadRequestException('Esse tipo de atividade está em uso — inative em vez de excluir');
    }
    await this.repo.remove(activityType);
  }
}
