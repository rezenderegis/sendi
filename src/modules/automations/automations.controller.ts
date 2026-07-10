import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AutomationsService } from './automations.service';
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from './dto/create-automation-rule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Automations')
@Controller('automations')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar regras de automação' })
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.automationsService.findAll(companyId);
  }

  // IMPORTANT: these routes must come BEFORE /:id to avoid UUID routing conflicts

  @Post('run-now')
  @ApiOperation({ summary: 'Disparar todas as regras ativas manualmente' })
  runNow(@CurrentUser('companyId') companyId: string) {
    return this.automationsService.runNow(companyId);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Próximos disparos agendados' })
  getUpcoming(
    @CurrentUser('companyId') companyId: string,
    @Query('days') days?: string,
  ) {
    const daysAhead = days ? parseInt(days, 10) : 7;
    return this.automationsService.getUpcoming(companyId, daysAhead);
  }

  @Get('history')
  @ApiOperation({ summary: 'Histórico de execuções paginado' })
  getHistory(
    @CurrentUser('companyId') companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('ruleId') ruleId?: string,
    @Query('status') status?: string,
  ) {
    return this.automationsService.getHistory(companyId, {
      ruleId,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da regra' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.automationsService.findOne(id, companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar regra de automação' })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateAutomationRuleDto,
  ) {
    return this.automationsService.create(companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar regra' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateAutomationRuleDto,
  ) {
    return this.automationsService.update(id, companyId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir regra' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.automationsService.remove(id, companyId);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Histórico de execuções da regra' })
  findExecutions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.automationsService.findExecutions(companyId, id);
  }

  @Post(':id/run-now')
  @ApiOperation({ summary: 'Disparar uma regra específica manualmente' })
  runRuleNow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.automationsService.runRuleNow(id, companyId);
  }

  @Get(':id/audience')
  @ApiOperation({ summary: 'Público da regra hoje (dry-run)' })
  getAudience(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.automationsService.getAudience(id, companyId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Estatísticas da regra de automação' })
  getStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.automationsService.getStats(id, companyId);
  }

  @Post('executions/:id/retry')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retentar execução com falha' })
  retryExecution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.automationsService.retryExecution(id, companyId);
  }
}
