import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { Contact } from './contact.entity';
import { ContactKanbanEvent } from './contact-kanban-event.entity';
import { Tag } from '../tags/tag.entity';
import { Conversation } from '../conversations/conversation.entity';
import { KanbanColumn } from '../kanban-columns/kanban-column.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, ContactKanbanEvent, Tag, Conversation, KanbanColumn])],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
