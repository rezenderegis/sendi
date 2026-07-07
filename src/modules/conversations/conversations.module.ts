import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { Conversation } from './conversation.entity';
import { ConversationEvent } from './conversation-event.entity';
import { Message } from './message.entity';
import { Tag } from '../tags/tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, ConversationEvent, Message, Tag])],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
