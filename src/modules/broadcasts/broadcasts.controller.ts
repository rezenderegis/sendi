import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BroadcastsService } from './broadcasts.service';
import { AddRecipientsDto, CreateBroadcastDto, UpdateBroadcastDto } from './dto/create-broadcast.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Broadcasts')
@Controller('broadcasts')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class BroadcastsController {
  constructor(private readonly service: BroadcastsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar broadcast' })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateBroadcastDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar broadcasts' })
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.service.findAll(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do broadcast' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.findById(id, companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar broadcast em rascunho' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateBroadcastDto,
  ) {
    return this.service.update(id, companyId, dto);
  }

  @Post(':id/recipients')
  @ApiOperation({ summary: 'Adicionar destinatários (por contactIds ou tagId)' })
  addRecipients(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: AddRecipientsDto,
  ) {
    return this.service.addRecipients(id, companyId, dto);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Confirmar envio do broadcast' })
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.send(id, companyId);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pausar broadcast em andamento' })
  pause(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.pause(id, companyId);
  }

  @Get(':id/recipients')
  @ApiOperation({ summary: 'Listar destinatários e status individual' })
  listRecipients(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.listRecipients(id, companyId);
  }

  @Get(':id/responses')
  @ApiOperation({ summary: 'Respostas ao broadcast com sentimento e link de conversa' })
  getResponses(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.getResponses(id, companyId);
  }
}
