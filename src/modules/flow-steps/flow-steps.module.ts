import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Flow } from './flow.entity';
import { FlowStep } from './flow-step.entity';
import { FlowsService } from './flows.service';
import { FlowStepsService } from './flow-steps.service';
import { FlowEngineService } from './flow-engine.service';
import { FlowsController } from './flows.controller';
import { ContactsModule } from '../contacts/contacts.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [TypeOrmModule.forFeature([Flow, FlowStep]), ContactsModule, ConversationsModule],
  controllers: [FlowsController],
  providers: [FlowsService, FlowStepsService, FlowEngineService],
  exports: [FlowsService, FlowStepsService, FlowEngineService],
})
export class FlowStepsModule {}
