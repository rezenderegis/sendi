import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappNumber } from '../whatsapp/whatsapp-number.entity';
import { CampaignPrompt } from '../campaign-prompts/campaign-prompt.entity';
import { WebhookTriggerEvent } from './webhook-trigger-event.entity';
import { WebhookTriggersController } from './webhook-triggers.controller';
import { WebhookTriggerManagementController } from './webhook-trigger-management.controller';
import { WebhookTriggersService } from './webhook-triggers.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ContactsModule } from '../contacts/contacts.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { FlowStepsModule } from '../flow-steps/flow-steps.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsappNumber, CampaignPrompt, WebhookTriggerEvent]),
    WhatsappModule,
    ContactsModule,
    ConversationsModule,
    FlowStepsModule,
  ],
  controllers: [WebhookTriggersController, WebhookTriggerManagementController],
  providers: [WebhookTriggersService],
})
export class WebhookTriggersModule {}
