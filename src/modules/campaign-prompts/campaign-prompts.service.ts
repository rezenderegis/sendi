import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignPrompt } from './campaign-prompt.entity';
import { PromptVersion } from './prompt-version.entity';
import { CreateCampaignPromptDto, UpdateCampaignPromptDto } from './dto/campaign-prompt.dto';

const MAX_VERSIONS = 20;

@Injectable()
export class CampaignPromptsService {
  constructor(
    @InjectRepository(CampaignPrompt)
    private readonly repo: Repository<CampaignPrompt>,
    @InjectRepository(PromptVersion)
    private readonly versionRepo: Repository<PromptVersion>,
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

    await this.saveVersion(prompt);

    Object.assign(prompt, dto);
    return this.repo.save(prompt);
  }

  async delete(id: string, companyId: string): Promise<void> {
    const prompt = await this.repo.findOne({ where: { id, companyId } });
    if (!prompt) throw new NotFoundException('Prompt não encontrado');
    await this.repo.remove(prompt);
  }

  async getVersions(id: string, companyId: string): Promise<PromptVersion[]> {
    const prompt = await this.repo.findOne({ where: { id, companyId } });
    if (!prompt) throw new NotFoundException('Prompt não encontrado');
    return this.versionRepo.find({
      where: { promptId: id },
      order: { savedAt: 'DESC' },
    });
  }

  async restore(id: string, companyId: string, versionId: string): Promise<CampaignPrompt> {
    const prompt = await this.repo.findOne({ where: { id, companyId } });
    if (!prompt) throw new NotFoundException('Prompt não encontrado');

    const version = await this.versionRepo.findOne({ where: { id: versionId, promptId: id } });
    if (!version) throw new NotFoundException('Versão não encontrada');

    await this.saveVersion(prompt);

    prompt.name = version.name;
    prompt.content = version.content;
    return this.repo.save(prompt);
  }

  private async saveVersion(prompt: CampaignPrompt): Promise<void> {
    await this.versionRepo.save(
      this.versionRepo.create({
        promptId: prompt.id,
        name: prompt.name,
        content: prompt.content,
      }),
    );

    const all = await this.versionRepo.find({
      where: { promptId: prompt.id },
      order: { savedAt: 'DESC' },
    });
    if (all.length > MAX_VERSIONS) {
      await this.versionRepo.remove(all.slice(MAX_VERSIONS));
    }
  }
}
