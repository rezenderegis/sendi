import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Broadcast } from './broadcast.entity';
import { BroadcastRecipient } from './broadcast-recipient.entity';
import { Conversation } from '../conversations/conversation.entity';
import { ConversationEvent } from '../conversations/conversation-event.entity';
import { Message } from '../conversations/message.entity';
import { BroadcastsService } from './broadcasts.service';
import { BroadcastsController } from './broadcasts.controller';
import { BroadcastProcessor } from './broadcast.processor';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { Tag } from '../tags/tag.entity';
import { CampaignPrompt } from '../campaign-prompts/campaign-prompt.entity';
import { BillingModule } from '../billing/billing.module';
import { WhatsappTemplate } from '../whatsapp/whatsapp-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Broadcast, BroadcastRecipient, Conversation, ConversationEvent, Message, Tag, CampaignPrompt, WhatsappTemplate]),
    BullModule.registerQueue({ name: 'broadcast' }),
    WhatsappModule,
    BillingModule,
  ],
  controllers: [BroadcastsController],
  providers: [BroadcastsService, BroadcastProcessor],
})
export class BroadcastsModule {}
