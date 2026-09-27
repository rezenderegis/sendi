import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformSettings } from './platform-settings.entity';
import { BalanceTransaction } from './balance-transaction.entity';
import { Company } from '../companies/company.entity';
import { WhatsappNumber } from '../whatsapp/whatsapp-number.entity';
import { Message } from '../conversations/message.entity';
import { User } from '../users/user.entity';
import { AppNotification } from '../follow-ons/notification.entity';
import { UsageService } from './usage.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformSettings, BalanceTransaction, Company, WhatsappNumber, Message, User, AppNotification])],
  providers: [UsageService],
  exports: [UsageService],
})
export class BillingModule {}
