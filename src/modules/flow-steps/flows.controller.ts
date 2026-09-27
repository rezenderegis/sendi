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
import { FlowsService } from './flows.service';
import { FlowStepsService } from './flow-steps.service';
import { CreateFlowDto, UpdateFlowDto } from './dto/flow.dto';
import { SaveFlowGraphDto } from './dto/flow-step.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Flows')
@Controller('flows')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class FlowsController {
  constructor(
    private readonly flowsService: FlowsService,
    private readonly flowStepsService: FlowStepsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar fluxos (Fluxo Guiado)' })
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.flowsService.findAll(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar fluxo' })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateFlowDto,
  ) {
    return this.flowsService.create(companyId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar fluxo' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.flowsService.findById(companyId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar fluxo (nome, descrição, passo inicial)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateFlowDto,
  ) {
    return this.flowsService.update(id, companyId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Excluir fluxo (remove os passos junto)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.flowsService.remove(id, companyId);
  }

  @Get(':id/steps')
  @ApiOperation({ summary: 'Listar passos do fluxo' })
  findSteps(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.flowStepsService.findAllByFlow(id, companyId);
  }

  @Post(':id/steps/graph')
  @ApiOperation({ summary: 'Salvar o grafo inteiro (canvas) do fluxo de uma vez' })
  saveGraph(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: SaveFlowGraphDto,
  ) {
    return this.flowStepsService.saveGraph(id, companyId, dto);
  }
}
