import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WhatsappProcessor } from './whatsapp.processor';
import { WhatsappNumber } from './whatsapp-number.entity';
import { WhatsappTemplate } from './whatsapp-template.entity';
import { BroadcastRecipient } from '../broadcasts/broadcast-recipient.entity';
import { Message } from '../conversations/message.entity';
import { AutomationExecution } from '../automations/automation-execution.entity';
import { ConversationsModule } from '../conversations/conversations.module';
import { ContactsModule } from '../contacts/contacts.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsappNumber, WhatsappTemplate, BroadcastRecipient, Message, AutomationExecution]),
    BullModule.registerQueue({ name: 'whatsapp' }),
    ConversationsModule,
    ContactsModule,
    AiModule,
  ],
  controllers: [WhatsappController, WebhookController],
  providers: [WhatsappService, WebhookService, WhatsappProcessor],
  exports: [WhatsappService],
})
export class WhatsappModule {}
