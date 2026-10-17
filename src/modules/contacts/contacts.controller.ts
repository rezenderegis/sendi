import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { IsBoolean, IsUUID } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto, MarkLostDto, UpdateContactDto } from './dto/create-contact.dto';

class AutomationOptOutDto {
  @IsBoolean()
  optOut: boolean;
}

class AddTagDto {
  @IsUUID()
  tagId: string;
}
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar contatos da empresa' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('broadcastId') broadcastId?: string,
    @Query('broadcastResponseFilter') broadcastResponseFilter?: string,
  ) {
    return this.contactsService.findAll(companyId, broadcastId, broadcastResponseFilter);
  }

  @Get('kanban')
  @ApiOperation({ summary: 'Listar contatos para o board do Kanban (com raia definida ou conversa iniciada)' })
  findForKanban(
    @CurrentUser('companyId') companyId: string,
    @Query('status') status?: 'active' | 'lost' | 'all',
  ) {
    return this.contactsService.findForKanban(companyId, status ?? 'active');
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Relatório de funil de conversão do Kanban' })
  getFunnel(
    @CurrentUser('companyId') companyId: string,
    @Query('days') days?: string,
  ) {
    return this.contactsService.getFunnel(companyId, Number(days) || 30);
  }

  @Get('by-phone')
  @ApiOperation({ summary: 'Buscar contato por telefone' })
  findByPhone(
    @CurrentUser('companyId') companyId: string,
    @Query('phone') phone: string,
  ) {
    return this.contactsService.findByPhone(phone, companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar contato' })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactsService.create(companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar contato' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(id, companyId, dto);
  }

  @Patch(':id/lost')
  @ApiOperation({ summary: 'Marcar lead como perdido, com motivo' })
  markLost(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: MarkLostDto,
  ) {
    return this.contactsService.markLost(id, companyId, dto.reason);
  }

  @Patch(':id/reopen')
  @ApiOperation({ summary: 'Reabrir um lead marcado como perdido' })
  reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.contactsService.reopen(id, companyId);
  }

  @Get('by-tag/:tagId')
  @ApiOperation({ summary: 'Listar contatos de uma tag' })
  findByTag(
    @Param('tagId', ParseUUIDPipe) tagId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.contactsService.findByTag(tagId, companyId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir contato' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.contactsService.delete(id, companyId);
  }

  @Post(':id/tags')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Adicionar tag ao contato' })
  addTag(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: AddTagDto,
  ) {
    return this.contactsService.addTag(id, companyId, dto.tagId);
  }

  @Delete(':id/tags/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover tag do contato' })
  removeTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.contactsService.removeTag(id, companyId, tagId);
  }

  @Patch(':id/automation-optout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Atualizar opt-out de automações do contato' })
  setAutomationOptOut(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: AutomationOptOutDto,
  ) {
    return this.contactsService.setAutomationOptOut(id, companyId, dto.optOut);
  }

  @Post('import')
  @ApiOperation({ summary: 'Importar contatos via CSV ou XLSX' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async importContacts(
    @CurrentUser('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('globalTagName') globalTagName?: string,
  ) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    return this.contactsService.importFromFile(
      file.buffer,
      file.mimetype,
      file.originalname,
      companyId,
      globalTagName,
    );
  }
}
