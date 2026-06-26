import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Get('whatsapp')
  @ApiOperation({ summary: 'Verificação do webhook pela Meta' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const result = this.webhookService.verifyWebhook(mode, token, challenge);
    if (!result) {
      throw new BadRequestException('Token de verificação inválido');
    }
    return result;
  }

  @Post('whatsapp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receber mensagens e status da Meta' })
  async receiveWebhook(@Body() payload: any): Promise<{ status: string }> {
    this.logger.debug(`Webhook recebido: ${JSON.stringify(payload)}`);
    await this.webhookService.handleWebhook(payload);
    return { status: 'ok' };
  }
}
