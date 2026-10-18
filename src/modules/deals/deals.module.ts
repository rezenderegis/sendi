import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deal } from './deal.entity';
import { DealKanbanEvent } from './deal-kanban-event.entity';
import { Contact } from '../contacts/contact.entity';
import { Conversation } from '../conversations/conversation.entity';
import { KanbanColumn } from '../kanban-columns/kanban-column.entity';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';

@Module({
  imports: [TypeOrmModule.forFeature([Deal, DealKanbanEvent, Contact, Conversation, KanbanColumn])],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
