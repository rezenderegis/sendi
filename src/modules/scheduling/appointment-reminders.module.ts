import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Appointment } from './appointment.entity';
import { Conversation } from '../conversations/conversation.entity';
import { AppointmentsCronService } from './appointments-cron.service';
import { SchedulingModule } from './scheduling.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

// Módulo separado só pra não criar ciclo: precisa de AppointmentsService
// (SchedulingModule) e WhatsappService (WhatsappModule) ao mesmo tempo, e
// WhatsappModule por sua vez importa SchedulingModule (pras tools da IA).
@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Conversation]), ScheduleModule.forRoot(), SchedulingModule, WhatsappModule],
  providers: [AppointmentsCronService],
})
export class AppointmentRemindersModule {}
