import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Site } from './site.entity';
import { Company } from '../companies/company.entity';
import { CreateSiteDto, UpdateSiteAdminDto, UpdateSiteDto } from './dto/site.dto';

@Injectable()
export class SitesService {
  constructor(
    @InjectRepository(Site)
    private readonly repository: Repository<Site>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  findAllByCompany(companyId: string): Promise<Site[]> {
    return this.repository.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  async findOneOwned(companyId: string, id: string): Promise<Site> {
    const site = await this.repository.findOne({ where: { id } });
    if (!site) throw new NotFoundException('Site não encontrado');
    if (site.companyId !== companyId) throw new ForbiddenException('Esse site não pertence à sua empresa');
    return site;
  }

  async assertPagesModuleEnabled(companyId: string): Promise<void> {
    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company?.enabledModules?.includes('pages')) {
      throw new ForbiddenException('Sua empresa não tem o módulo de páginas habilitado');
    }
  }

  async create(companyId: string, dto: CreateSiteDto): Promise<Site> {
    await this.assertPagesModuleEnabled(companyId);

    const existing = await this.repository.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Já existe um site com esse slug');

    const site = this.repository.create({ ...dto, companyId });
    return this.repository.save(site);
  }

  async update(companyId: string, id: string, dto: UpdateSiteDto): Promise<Site> {
    const site = await this.findOneOwned(companyId, id);
    await this.repository.update({ id: site.id }, dto);
    return this.findOneOwned(companyId, id);
  }

  async remove(companyId: string, id: string): Promise<void> {
    const site = await this.findOneOwned(companyId, id);
    await this.repository.delete({ id: site.id });
  }

  // --- Público (consultado pelo sendi-web em runtime, sem auth) ---

  async findByDomain(domain: string): Promise<Pick<Site, 'slug' | 'isActive'> | null> {
    const site = await this.repository.findOne({ where: { domain }, select: ['slug', 'isActive'] });
    return site ?? null;
  }

  findBySlugPublic(slug: string): Promise<Site | null> {
    return this.repository.findOne({ where: { slug } });
  }

  // --- Admin (plataforma) ---

  findAll(): Promise<Site[]> {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  async updateAdmin(id: string, dto: UpdateSiteAdminDto): Promise<Site> {
    const site = await this.repository.findOne({ where: { id } });
    if (!site) throw new NotFoundException('Site não encontrado');
    if (dto.domain) {
      const existing = await this.repository.findOne({ where: { domain: dto.domain } });
      if (existing && existing.id !== id) throw new ConflictException('Esse domínio já está em uso por outro site');
    }
    await this.repository.update({ id }, dto);
    return this.repository.findOne({ where: { id } }) as Promise<Site>;
  }
}
