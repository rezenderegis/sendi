import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { Contact } from './contact.entity';
import { Tag } from '../tags/tag.entity';
import { Conversation } from '../conversations/conversation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Tag, Conversation])],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
