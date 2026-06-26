import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WhatsappProcessor } from './whatsapp.processor';
import { WhatsappNumber } from './whatsapp-number.entity';
import { ConversationsModule } from '../conversations/conversations.module';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsappNumber]),
    BullModule.registerQueue({ name: 'whatsapp' }),
    ConversationsModule,
    ContactsModule,
  ],
  controllers: [WhatsappController, WebhookController],
  providers: [WhatsappService, WebhookService, WhatsappProcessor],
  exports: [WhatsappService],
})
export class WhatsappModule {}
