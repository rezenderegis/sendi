import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignPrompt } from './campaign-prompt.entity';
import { CreateCampaignPromptDto, UpdateCampaignPromptDto } from './dto/campaign-prompt.dto';

@Injectable()
export class CampaignPromptsService {
  constructor(
    @InjectRepository(CampaignPrompt)
    private readonly repo: Repository<CampaignPrompt>,
  ) {}

  findAll(companyId: string): Promise<CampaignPrompt[]> {
    return this.repo.find({ where: { companyId }, order: { name: 'ASC' } });
  }

  create(companyId: string, dto: CreateCampaignPromptDto): Promise<CampaignPrompt> {
    return this.repo.save(this.repo.create({ ...dto, companyId }));
  }

  async update(id: string, companyId: string, dto: UpdateCampaignPromptDto): Promise<CampaignPrompt> {
    const prompt = await this.repo.findOne({ where: { id, companyId } });
    if (!prompt) throw new NotFoundException('Prompt não encontrado');
    Object.assign(prompt, dto);
    return this.repo.save(prompt);
  }

  async delete(id: string, companyId: string): Promise<void> {
    const prompt = await this.repo.findOne({ where: { id, companyId } });
    if (!prompt) throw new NotFoundException('Prompt não encontrado');
    await this.repo.remove(prompt);
  }
}
