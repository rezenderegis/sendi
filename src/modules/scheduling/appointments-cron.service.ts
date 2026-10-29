import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './appointment.entity';
import { Conversation } from '../conversations/conversation.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';

// Lembrete automático pra reduzir no-show — mesmo padrão de cron do
// FollowOnsCronService, rodando a cada minuto.
@Injectable()
export class AppointmentsCronService {
  private readonly logger = new Logger(AppointmentsCronService.name);

  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly whatsappService: WhatsappService,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
  ) {}

  @Cron('* * * * *') // todo minuto
  async sendReminders() {
    const due = await this.appointmentsService.findDueForReminder(new Date());
    if (!due.length) return;

    this.logger.log(`Enviando ${due.length} lembrete(s) de agendamento`);

    for (const appointment of due) {
      // Marca ANTES de tentar enviar (não depois do try/catch) — se marcasse só
      // depois de sendMessage() completar sem erro, qualquer falha posterior ao
      // envio de fato (gravar a mensagem, registrar uso, etc.) deixava
      // reminderSentAt nulo pra sempre, e o agendamento voltava a ser "devido"
      // no próximo minuto, reenviando o lembrete indefinidamente — já aconteceu
      // em produção. Pra um lembrete, reenviar é muito pior que eventualmente
      // perder um por falha pontual, então marca otimista antes de tentar.
      await this.appointmentRepository.update(appointment.id, { reminderSentAt: new Date() });

      try {
        const conversation = await this.conversationRepository.findOne({
          where: { contactId: appointment.contactId },
          order: { lastMessageAt: 'DESC' },
        });
        if (!conversation) {
          this.logger.warn(`Sem conversa pra avisar contactId=${appointment.contactId} (agendamento ${appointment.id})`);
          continue;
        }

        const when = appointment.scheduledAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        const serviceName = appointment.service?.name ?? 'seu atendimento';
        const professionalName = appointment.professional?.name;
        const message = professionalName
          ? `Lembrete: você tem ${serviceName} com ${professionalName} marcado pra ${when}.`
          : `Lembrete: você tem ${serviceName} marcado pra ${when}.`;

        await this.whatsappService.sendMessage(appointment.companyId, null, {
          whatsappNumberId: conversation.whatsappNumberId,
          to: appointment.contact.phone,
          message,
          type: 'text',
        });
      } catch (e: any) {
        this.logger.error(`Falha ao enviar lembrete do agendamento ${appointment.id}: ${e.message}`);
      }
    }
  }
}
