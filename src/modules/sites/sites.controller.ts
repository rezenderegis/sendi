import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SitesService } from './sites.service';
import { CreateSiteDto, UpdateSiteDto } from './dto/site.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sites')
@Controller('sites-mine')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar sites da empresa logada' })
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.sitesService.findAllByCompany(companyId);
  }

  @Get(':id')
  findOne(@CurrentUser('companyId') companyId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.sitesService.findOneOwned(companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar site novo' })
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateSiteDto) {
    return this.sitesService.create(companyId, dto);
  }

  @Patch(':id')
  update(@CurrentUser('companyId') companyId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSiteDto) {
    return this.sitesService.update(companyId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser('companyId') companyId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.sitesService.remove(companyId, id);
  }
}
