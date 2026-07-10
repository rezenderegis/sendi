import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutomationsService } from './automations.service';

@Injectable()
export class AutomationsCronService {
  private readonly logger = new Logger(AutomationsCronService.name);

  constructor(private readonly automationsService: AutomationsService) {}

  @Cron('0 8 * * *') // todo dia às 08:00
  async handleDailyRun() {
    this.logger.log('Iniciando execução diária das automações...');
    await this.automationsService.runAll();
    this.logger.log('Execução diária das automações concluída.');
  }
}
