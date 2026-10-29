import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LandingPage } from './landing-page.entity';

@Injectable()
export class LandingPagesService {
  constructor(
    @InjectRepository(LandingPage)
    private readonly repository: Repository<LandingPage>,
  ) {}

  findAll(): Promise<LandingPage[]> {
    return this.repository.find({ order: { name: 'ASC' } });
  }

  async setActive(slug: string, isActive: boolean): Promise<LandingPage> {
    const landingPage = await this.repository.findOne({ where: { slug } });
    if (!landingPage) throw new NotFoundException('Landing page não encontrada');
    await this.repository.update({ slug }, { isActive });
    landingPage.isActive = isActive;
    return landingPage;
  }
}
