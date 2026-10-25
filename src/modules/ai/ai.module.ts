import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ExternalActionsModule } from '../external-actions/external-actions.module';
import { FlowStepsModule } from '../flow-steps/flow-steps.module';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [ExternalActionsModule, FlowStepsModule, SchedulingModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
