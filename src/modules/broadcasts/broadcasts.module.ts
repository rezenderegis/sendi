import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Broadcast } from './broadcast.entity';
import { BroadcastRecipient } from './broadcast-recipient.entity';
import { ConversationEvent } from '../conversations/conversation-event.entity';
import { Message } from '../conversations/message.entity';
import { BroadcastsService } from './broadcasts.service';
import { BroadcastsController } from './broadcasts.controller';
import { BroadcastProcessor } from './broadcast.processor';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Broadcast, BroadcastRecipient, ConversationEvent, Message]),
    BullModule.registerQueue({ name: 'broadcast' }),
    WhatsappModule,
  ],
  controllers: [BroadcastsController],
  providers: [BroadcastsService, BroadcastProcessor],
})
export class BroadcastsModule {}
