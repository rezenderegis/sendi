import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AutomationRule } from './automation-rule.entity';
import { AutomationExecution } from './automation-execution.entity';
import { AutomationsService } from './automations.service';
import { AutomationsCronService } from './automations-cron.service';
import { AutomationsController } from './automations.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationRule, AutomationExecution]),
    ScheduleModule.forRoot(),
    WhatsappModule,
  ],
  controllers: [AutomationsController],
  providers: [AutomationsService, AutomationsCronService],
  exports: [AutomationsService],
})
export class AutomationsModule {}
