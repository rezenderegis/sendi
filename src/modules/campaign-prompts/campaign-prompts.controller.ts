import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CampaignPromptsService } from './campaign-prompts.service';
import { CreateCampaignPromptDto, UpdateCampaignPromptDto } from './dto/campaign-prompt.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Campaign Prompts')
@Controller('campaign-prompts')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class CampaignPromptsController {
  constructor(private readonly service: CampaignPromptsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar prompts de campanha' })
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.service.findAll(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar prompt de campanha' })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateCampaignPromptDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar prompt de campanha' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateCampaignPromptDto,
  ) {
    return this.service.update(id, companyId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Excluir prompt de campanha' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.delete(id, companyId);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Listar versões anteriores do prompt' })
  getVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.getVersions(id, companyId);
  }

  @Post(':id/restore/:versionId')
  @ApiOperation({ summary: 'Restaurar versão anterior do prompt' })
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.restore(id, companyId, versionId);
  }
}
