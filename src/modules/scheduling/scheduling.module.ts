import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from './service.entity';
import { Professional } from './professional.entity';
import { ProfessionalAvailability } from './professional-availability.entity';
import { ProfessionalTimeOff } from './professional-time-off.entity';
import { Appointment } from './appointment.entity';
import { User } from '../users/user.entity';
import { AppNotification } from '../follow-ons/notification.entity';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsController } from './professionals.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';

// Não importa WhatsappModule aqui — quem precisa enviar mensagem (o cron de
// lembrete) fica num módulo separado (AppointmentRemindersModule), pra evitar
// ciclo: WhatsappModule importa este módulo pra dar às tools da IA acesso a
// ServicesService/AppointmentsService.
@Module({
  imports: [TypeOrmModule.forFeature([Service, Professional, ProfessionalAvailability, ProfessionalTimeOff, Appointment, User, AppNotification])],
  controllers: [ServicesController, ProfessionalsController, AppointmentsController],
  providers: [ServicesService, ProfessionalsService, AppointmentsService],
  exports: [ServicesService, ProfessionalsService, AppointmentsService],
})
export class SchedulingModule {}
