import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { ConnectNumberDto, CreateTemplateDto, SendMessageDto, UpdateWhatsappNumberDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('WhatsApp')
@Controller('whatsapp')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('numbers')
  @ApiOperation({ summary: 'Conectar número WhatsApp' })
  connectNumber(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: ConnectNumberDto,
  ) {
    return this.whatsappService.connectNumber(companyId, dto);
  }

  @Get('numbers')
  @ApiOperation({ summary: 'Listar números da empresa' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('allowedNumberIds') allowedNumberIds: string[] | null,
  ) {
    const numberFilter = role === 'owner' ? null : allowedNumberIds;
    return this.whatsappService.findAll(companyId, numberFilter);
  }

  @Patch('numbers/:id')
  @ApiOperation({ summary: 'Atualizar configurações do número (ex: prompt do bot)' })
  updateNumber(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('canConfigureBot') canConfigureBot: boolean,
    @Body() dto: UpdateWhatsappNumberDto,
  ) {
    if (role !== 'owner' && canConfigureBot === false) {
      throw new ForbiddenException('Você não tem permissão para configurar o bot');
    }
    return this.whatsappService.updateNumber(id, companyId, dto);
  }

  @Delete('numbers/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Remover número (somente owner)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.whatsappService.remove(id, companyId);
  }

  @Post('numbers/:id/test')
  @ApiOperation({ summary: 'Enviar mensagem de teste' })
  sendTest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.whatsappService.sendTestMessage(id, companyId);
  }

  @Post('numbers/:id/templates/sync')
  @ApiOperation({ summary: 'Sincronizar templates aprovados da Meta' })
  syncTemplates(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.whatsappService.syncTemplates(id, companyId);
  }

  @Get('numbers/:id/templates')
  @ApiOperation({ summary: 'Listar templates do número' })
  listTemplates(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.whatsappService.listTemplates(id, companyId);
  }

  @Post('numbers/:id/templates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Criar e submeter template para aprovação da Meta (somente owner)' })
  createTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.whatsappService.createTemplate(id, companyId, dto);
  }

  @Post('messages/send')
  @ApiOperation({ summary: 'Enviar mensagem de texto' })
  sendMessage(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.whatsappService.sendMessage(companyId, dto);
  }
}
