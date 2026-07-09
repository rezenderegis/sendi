import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
    @CurrentUser('role') role: string,
    @CurrentUser('canSendBroadcast') canSendBroadcast: boolean,
    @CurrentUser('allowedNumberIds') allowedNumberIds: string[] | null,
    @Body() dto: CreateBroadcastDto,
  ) {
    if (role !== 'owner' && canSendBroadcast === false) {
      throw new ForbiddenException('Você não tem permissão para criar broadcasts');
    }
    if (role !== 'owner' && allowedNumberIds?.length && !allowedNumberIds.includes(dto.whatsappNumberId)) {
      throw new ForbiddenException('Você não tem acesso a este número');
    }
    return this.service.create(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar broadcasts' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('allowedNumberIds') allowedNumberIds: string[] | null,
  ) {
    const numberFilter = role === 'owner' ? null : allowedNumberIds;
    return this.service.findAll(companyId, numberFilter);
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

  @Post(':id/recipients/csv')
  @ApiOperation({ summary: 'Importar destinatários via CSV com mensagens personalizadas' })
  @UseInterceptors(FileInterceptor('file'))
  addRecipientsFromCsv(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: string = 'text',
  ) {
    return this.service.addRecipientsFromCsv(id, companyId, file.buffer, type);
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
    @CurrentUser('role') role: string,
    @CurrentUser('canSendBroadcast') canSendBroadcast: boolean,
  ) {
    if (role !== 'owner' && canSendBroadcast === false) {
      throw new ForbiddenException('Você não tem permissão para enviar broadcasts');
    }
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

  @Get('failures')
  @ApiOperation({ summary: 'Listar falhas de entrega de todos os broadcasts' })
  listFailures(
    @CurrentUser('companyId') companyId: string,
    @Query('broadcastId') broadcastId?: string,
  ) {
    return this.service.listFailures(companyId, broadcastId);
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
