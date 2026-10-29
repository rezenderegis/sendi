import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LandingPagesService } from './landing-pages.service';

// Endpoint público (sem auth) — consultado pelas próprias landing pages
// estáticas do sendi-web (globalsix, sende, sf-pintura) pra decidir se
// renderizam o conteúdo normal ou "página indisponível".
@ApiTags('Landing Pages')
@Controller('landing-pages')
export class LandingPagesController {
  constructor(private readonly landingPagesService: LandingPagesService) {}

  @Get()
  async findAll() {
    const pages = await this.landingPagesService.findAll();
    return pages.map((p) => ({ slug: p.slug, isActive: p.isActive }));
  }
}
