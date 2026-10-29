import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/company.entity';
import { WhatsappNumber } from '../whatsapp/whatsapp-number.entity';
import { BillingModule } from '../billing/billing.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { LandingPagesModule } from '../landing-pages/landing-pages.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Company, WhatsappNumber]), BillingModule, WhatsappModule, LandingPagesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
