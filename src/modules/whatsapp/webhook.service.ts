import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly whatsappService: WhatsappService,
  ) {}

  verifyWebhook(
    mode: string,
    token: string,
    challenge: string,
  ): string | null {
    const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Webhook verificado com sucesso pela Meta');
      return challenge;
    }

    return null;
  }

  async handleWebhook(payload: any): Promise<void> {
    if (payload.object !== 'whatsapp_business_account') {
      this.logger.warn(`Objeto desconhecido no webhook: ${payload.object}`);
      return;
    }

    try {
      await this.whatsappService.processInboundMessage(payload);
    } catch (error) {
      this.logger.error(`Erro ao processar webhook: ${error.message}`, error.stack);
    }
  }
}
