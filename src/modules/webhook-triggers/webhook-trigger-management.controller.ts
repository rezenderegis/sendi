import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { encrypt } from '../../common/utils/crypto.util';
import { WhatsappNumber } from '../whatsapp/whatsapp-number.entity';
import { WebhookTriggerEvent } from './webhook-trigger-event.entity';

@ApiTags('Webhook de Disparo — gestão')
@Controller('whatsapp/numbers')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class WebhookTriggerManagementController {
  constructor(
    @InjectRepository(WhatsappNumber)
    private readonly numberRepo: Repository<WhatsappNumber>,
    @InjectRepository(WebhookTriggerEvent)
    private readonly eventRepo: Repository<WebhookTriggerEvent>,
    private readonly configService: ConfigService,
  ) {}

  @Get(':id/webhook-secret')
  @ApiOperation({ summary: 'Verifica se o webhook de disparo já tem uma chave gerada' })
  async getStatus(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('companyId') companyId: string) {
    const number = await this.numberRepo
      .createQueryBuilder('n')
      .addSelect('n.triggerWebhookSecret')
      .where('n.id = :id AND n.companyId = :companyId', { id, companyId })
      .getOne();
    if (!number) throw new NotFoundException('Número não encontrado');
    return { hasSecret: !!number.triggerWebhookSecret };
  }

  @Post(':id/webhook-secret/regenerate')
  @ApiOperation({ summary: 'Gera (ou substitui) a chave do webhook de disparo — mostrada em texto puro só nessa resposta' })
  async regenerate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('companyId') companyId: string) {
    const number = await this.numberRepo.findOne({ where: { id, companyId } });
    if (!number) throw new NotFoundException('Número não encontrado');
    const secret = crypto.randomBytes(24).toString('hex');
    await this.numberRepo.update(id, { triggerWebhookSecret: encrypt(secret, this.configService) });
    return { secret };
  }

  @Get(':id/webhook-events')
  @ApiOperation({ summary: 'Lista os últimos disparos recebidos pelo webhook desse número' })
  listEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventRepo.find({
      where: { whatsappNumberId: id, companyId },
      order: { createdAt: 'DESC' },
      take: limit ? Number(limit) : 20,
    });
  }
}
