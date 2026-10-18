import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DealsService } from './deals.service';
import { CreateDealDto, MarkDealLostDto, UpdateDealDto } from './dto/deal.dto';

@ApiTags('Deals')
@Controller('deals')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get('kanban')
  @ApiOperation({ summary: 'Listar negócios para o board do Kanban' })
  findForKanban(
    @CurrentUser('companyId') companyId: string,
    @Query('status') status?: 'active' | 'lost' | 'all',
  ) {
    return this.dealsService.findForKanban(companyId, status ?? 'active');
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Relatório de funil de conversão do Kanban' })
  getFunnel(
    @CurrentUser('companyId') companyId: string,
    @Query('days') days?: string,
  ) {
    return this.dealsService.getFunnel(companyId, Number(days) || 30);
  }

  @Post()
  @ApiOperation({ summary: 'Criar negócio pra um contato existente' })
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateDealDto) {
    return this.dealsService.create(companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar negócio (título, raia, valor, dono)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateDealDto,
  ) {
    return this.dealsService.update(id, companyId, dto);
  }

  @Patch(':id/lost')
  @ApiOperation({ summary: 'Marcar negócio como perdido, com motivo' })
  markLost(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: MarkDealLostDto,
  ) {
    return this.dealsService.markLost(id, companyId, dto.reason);
  }

  @Patch(':id/reopen')
  @ApiOperation({ summary: 'Reabrir um negócio marcado como perdido' })
  reopen(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('companyId') companyId: string) {
    return this.dealsService.reopen(id, companyId);
  }
}
