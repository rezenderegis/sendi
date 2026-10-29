import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SitesService } from './sites.service';

// Endpoints públicos (sem auth) — consultados pelo sendi-web em runtime pro
// middleware de domínio e pra servir o HTML de cada site.
@ApiTags('Sites (público)')
@Controller('sites')
export class SitesPublicController {
  constructor(private readonly sitesService: SitesService) {}

  @Get('by-domain/:domain')
  async findByDomain(@Param('domain') domain: string) {
    const site = await this.sitesService.findByDomain(domain);
    if (!site) throw new NotFoundException('Nenhum site nesse domínio');
    return site;
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    const site = await this.sitesService.findBySlugPublic(slug);
    if (!site) throw new NotFoundException('Site não encontrado');
    return { slug: site.slug, name: site.name, content: site.content, isActive: site.isActive };
  }
}
