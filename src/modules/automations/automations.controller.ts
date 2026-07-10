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
}
