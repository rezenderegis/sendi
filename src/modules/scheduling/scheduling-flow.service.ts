import { Injectable } from '@nestjs/common';
import { ServicesService } from './services.service';
import { AppointmentsService, AvailableSlot } from './appointments.service';
import { Service } from './service.entity';

export type SchedulingState =
  | { step: 'service' }
  | { step: 'day'; serviceId: string }
  | { step: 'time'; serviceId: string; day: string };

// O gatilho que INICIA o agendamento é detectado por palavra-chave, não por
// tool-call de IA — a IA tinha a liberdade de "explicar" o processo antes de
// chamar a ferramenta, e acabava inventando opções que não existem (tipo
// "prefere um link ou que um consultor ligue?"). Palavra-chave bate, chama
// start() direto, sem a IA no meio — igual isRequestingHuman/isSupportRequest
// já fazem no whatsapp.processor.ts. Centralizado aqui (não duplicado no
// processor e no simulador) pra evitar as duas cópias divergirem de novo.
function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const SCHEDULING_WORDS = [
  'agendar', 'agendamento', 'agende', 'agendando',
  'marcar horario', 'marcar um horario', 'marcar uma consulta', 'marcar consulta', 'quero marcar',
  'tem horario', 'tem algum horario', 'horario disponivel', 'horarios disponiveis',
  'horario livre', 'horarios livres',
];

export function isRequestingScheduling(text: string): boolean {
  const n = normalizeText(text);
  return SCHEDULING_WORDS.some((w) => n.includes(w));
}

export interface SchedulingStepResult {
  bodyText: string;
  options: { label: string; value: string }[];
  // null = fluxo terminou (agendado, sem horários, ou resposta não reconhecida demais vezes)
  nextState: SchedulingState | null;
}

const WEEKDAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// dateStr no formato YYYY-MM-DD (mesmo formato que o AppointmentsService usa
// internamente pra bucketizar os dias) — reconstrói como data local pra achar
// o dia da semana sem risco de virar o dia por fuso.
function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAY_ABBR[date.getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

// getHours/getMinutes (hora local do processo) — igual o AppointmentsService
// usa setHours pra montar os slots. Manter os dois lados na mesma base evita
// o horário mostrado ficar errado.
function formatTimeLabel(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function buildTimeOptions(daySlots: AvailableSlot[]): { label: string; value: string }[] {
  const multiplePros = new Set(daySlots.map((s) => s.professionalId)).size > 1;
  return daySlots.slice(0, 10).map((s) => ({
    label: multiplePros ? `${formatTimeLabel(s.startAt)} - ${s.professionalName}` : formatTimeLabel(s.startAt),
    value: `${s.professionalId}|${s.startAt.toISOString()}`,
  }));
}

// Condução 100% determinística (sem IA) do fluxo fixo serviço -> dia ->
// horário. Cada etapa casa a resposta contra uma lista recém-calculada do
// banco — nunca confia em texto livre interpretado por LLM. Usado tanto pelo
// WhatsApp real (whatsapp.processor.ts) quanto pelo simulador de prompt
// (ai.controller.ts, com isSimulated=true pra nunca gravar agendamento de
// teste no banco).
@Injectable()
export class SchedulingFlowService {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  async findActiveServices(companyId: string): Promise<Service[]> {
    return this.servicesService.findAll(companyId).then((list) => list.filter((s) => s.isActive));
  }

  async start(companyId: string): Promise<SchedulingStepResult> {
    const activeServices = await this.findActiveServices(companyId);
    if (activeServices.length === 1) return this.startDaySelection(companyId, activeServices[0]);

    return {
      bodyText: 'Qual serviço você quer agendar?',
      options: activeServices.map((s) => ({ label: s.name, value: s.id })),
      nextState: { step: 'service' },
    };
  }

  private async startDaySelection(companyId: string, service: Service): Promise<SchedulingStepResult> {
    const slots = await this.appointmentsService.findAvailableSlots(companyId, { serviceId: service.id });
    const days = [...new Set(slots.map((s) => s.startAt.toISOString().slice(0, 10)))];

    if (days.length === 0) {
      return {
        bodyText: `Não encontrei horários livres pra ${service.name} nos próximos dias. Vou chamar um atendente pra te ajudar.`,
        options: [],
        nextState: null,
      };
    }

    return {
      bodyText: `Pra qual dia você quer agendar ${service.name}?`,
      options: days.map((d) => ({ label: formatDayLabel(d), value: d })),
      nextState: { step: 'day', serviceId: service.id },
    };
  }

  private async findDaySlots(companyId: string, serviceId: string, day: string): Promise<AvailableSlot[]> {
    const from = new Date(`${day}T00:00:00.000Z`);
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    return this.appointmentsService.findAvailableSlots(companyId, { serviceId, from, to });
  }

  private async startTimeSelection(companyId: string, serviceId: string, day: string): Promise<SchedulingStepResult> {
    const daySlots = await this.findDaySlots(companyId, serviceId, day);

    if (daySlots.length === 0) {
      const remainingSlots = await this.appointmentsService.findAvailableSlots(companyId, { serviceId });
      const days = [...new Set(remainingSlots.map((s) => s.startAt.toISOString().slice(0, 10)))].filter((d) => d !== day);
      return {
        bodyText: 'Esse dia acabou de ficar sem horários — escolha outro dia:',
        options: days.map((d) => ({ label: formatDayLabel(d), value: d })),
        nextState: { step: 'day', serviceId },
      };
    }

    return {
      bodyText: `Horários disponíveis em ${formatDayLabel(day)}:`,
      options: buildTimeOptions(daySlots),
      nextState: { step: 'time', serviceId, day },
    };
  }

  // contactId só é usado pra agendar de verdade (isSimulated=false) — o
  // simulador nunca grava um Appointment real no banco.
  async advance(
    companyId: string,
    state: SchedulingState,
    replyText: string,
    interactiveReplyId: string | null,
    contactId: string | null,
    isSimulated: boolean,
  ): Promise<SchedulingStepResult> {
    const normalized = replyText.trim().toLowerCase();

    if (state.step === 'service') {
      const activeServices = await this.findActiveServices(companyId);
      const matched = activeServices.find(
        (s) => (interactiveReplyId && s.id === interactiveReplyId) || s.name.toLowerCase() === normalized,
      );
      if (!matched) {
        return {
          bodyText: 'Não entendi. Escolha um serviço da lista:',
          options: activeServices.map((s) => ({ label: s.name, value: s.id })),
          nextState: { step: 'service' },
        };
      }
      return this.startDaySelection(companyId, matched);
    }

    if (state.step === 'day') {
      const slots = await this.appointmentsService.findAvailableSlots(companyId, { serviceId: state.serviceId });
      const days = [...new Set(slots.map((s) => s.startAt.toISOString().slice(0, 10)))];
      const matchedDay = days.find(
        (d) => (interactiveReplyId && d === interactiveReplyId) || formatDayLabel(d).toLowerCase() === normalized,
      );
      if (!matchedDay) {
        return {
          bodyText: 'Não entendi. Escolha um dia da lista:',
          options: days.map((d) => ({ label: formatDayLabel(d), value: d })),
          nextState: { step: 'day', serviceId: state.serviceId },
        };
      }
      return this.startTimeSelection(companyId, state.serviceId, matchedDay);
    }

    // state.step === 'time'
    const daySlots = await this.findDaySlots(companyId, state.serviceId, state.day);
    const options = buildTimeOptions(daySlots);
    const matched = options.find(
      (o) => (interactiveReplyId && o.value === interactiveReplyId) || o.label.toLowerCase() === normalized,
    );
    if (!matched) {
      return { bodyText: 'Não entendi. Escolha um horário da lista:', options, nextState: { step: 'time', serviceId: state.serviceId, day: state.day } };
    }

    const [professionalId, isoStart] = matched.value.split('|');

    if (isSimulated) {
      return {
        bodyText: `(simulação) Agendamento confirmado pra ${formatDayLabel(state.day)} às ${matched.label.split(' - ')[0]}.`,
        options: [],
        nextState: null,
      };
    }

    try {
      const appointment = await this.appointmentsService.createAppointment(companyId, {
        contactId: contactId!,
        serviceId: state.serviceId,
        professionalId,
        scheduledAt: isoStart,
      });
      return {
        bodyText: `Agendado! ${appointment.service?.name} dia ${formatDayLabel(state.day)} às ${formatTimeLabel(appointment.scheduledAt)} com ${appointment.professional?.name}. Te esperamos!`,
        options: [],
        nextState: null,
      };
    } catch (e: any) {
      const retry = await this.startTimeSelection(companyId, state.serviceId, state.day);
      return { ...retry, bodyText: `${e.message}\n\n${retry.bodyText}` };
    }
  }
}
