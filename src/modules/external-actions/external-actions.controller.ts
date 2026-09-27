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
import { ExternalActionsService } from './external-actions.service';
import { CreateExternalActionDto, TestExternalActionDto, UpdateExternalActionDto } from './dto/external-action.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('External Actions')
@Controller('external-actions')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class ExternalActionsController {
  constructor(private readonly service: ExternalActionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar ações externas (tools do bot)' })
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.service.findAll(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar ação externa' })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateExternalActionDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Post('test')
  @ApiOperation({ summary: 'Testar uma requisição sem salvar a ação' })
  test(@Body() dto: TestExternalActionDto) {
    return this.service.test(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar ação externa' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.findById(id, companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar ação externa' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateExternalActionDto,
  ) {
    return this.service.update(id, companyId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Excluir ação externa' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.remove(id, companyId);
  }
}
