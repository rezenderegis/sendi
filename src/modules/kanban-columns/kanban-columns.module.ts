import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KanbanColumn } from './kanban-column.entity';
import { KanbanColumnsController } from './kanban-columns.controller';
import { KanbanColumnsService } from './kanban-columns.service';

@Module({
  imports: [TypeOrmModule.forFeature([KanbanColumn])],
  controllers: [KanbanColumnsController],
  providers: [KanbanColumnsService],
})
export class KanbanColumnsModule {}
