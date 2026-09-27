import { Body, Controller, Headers, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { WebhookTriggersService } from './webhook-triggers.service';
import { TriggerWebhookDto } from './dto/trigger-webhook.dto';

/**
 * Endpoint público (sem JwtAuthGuard) — chamado pelo sistema externo do próprio cliente
 * (CRM, e-commerce, etc), autenticado via secret próprio por número (ver webhook-trigger-management.controller.ts).
 */
@ApiTags('Webhook de Disparo')
@Controller('webhooks')
export class WebhookTriggersController {
  constructor(private readonly webhookTriggersService: WebhookTriggersService) {}

  @Post('trigger/:whatsappNumberId')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Dispara uma conversa (prompt e/ou fluxo) pra um telefone, a partir de um sistema externo' })
  trigger(
    @Param('whatsappNumberId', ParseUUIDPipe) whatsappNumberId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: TriggerWebhookDto,
  ) {
    const secret = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;
    return this.webhookTriggersService.trigger(whatsappNumberId, secret, dto);
  }
}
