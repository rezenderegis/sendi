import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { ConnectNumberDto, SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.whatsappService.findAll(companyId);
  }

  @Delete('numbers/:id')
  @ApiOperation({ summary: 'Remover número' })
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

  @Post('messages/send')
  @ApiOperation({ summary: 'Enviar mensagem de texto' })
  sendMessage(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.whatsappService.sendMessage(companyId, dto);
  }
}
