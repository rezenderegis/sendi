import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './appointment.entity';
import { Professional } from './professional.entity';
import { Service } from './service.entity';
import { ProfessionalAvailability } from './professional-availability.entity';
import { ProfessionalTimeOff } from './professional-time-off.entity';
import { User, UserRole } from '../users/user.entity';
import { AppNotification } from '../follow-ons/notification.entity';
import { CreateAppointmentDto, RescheduleAppointmentDto } from './dto/appointment.dto';

const SLOT_STEP_MINUTES = 30;
const DEFAULT_RANGE_DAYS = 7;
const MAX_SLOTS_RETURNED = 50;

export interface AvailableSlot {
  professionalId: string;
  professionalName: string;
  startAt: Date;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Professional)
    private readonly professionalRepository: Repository<Professional>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(ProfessionalAvailability)
    private readonly availabilityRepository: Repository<ProfessionalAvailability>,
    @InjectRepository(ProfessionalTimeOff)
    private readonly timeOffRepository: Repository<ProfessionalTimeOff>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AppNotification)
    private readonly notificationRepository: Repository<AppNotification>,
  ) {}

  async findAll(
    companyId: string,
    filters: { professionalId?: string; from?: Date; to?: Date } = {},
  ): Promise<Appointment[]> {
    const qb = this.appointmentRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.contact', 'contact')
      .leftJoinAndSelect('a.professional', 'professional')
      .leftJoinAndSelect('a.service', 'service')
      .where('a.companyId = :companyId', { companyId })
      .orderBy('a.scheduledAt', 'ASC');

    if (filters.professionalId) qb.andWhere('a.professionalId = :professionalId', { professionalId: filters.professionalId });
    if (filters.from) qb.andWhere('a.scheduledAt >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('a.scheduledAt < :to', { to: filters.to });
    if (!filters.from && !filters.to) {
      qb.andWhere('a.status = :status', { status: AppointmentStatus.SCHEDULED }).andWhere('a.scheduledAt >= :now', { now: new Date() }).take(100);
    }

    return qb.getMany();
  }

  async findById(id: string, companyId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id, companyId },
      relations: ['contact', 'professional', 'service'],
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado');
    return appointment;
  }

  // Profissionais ativos que prestam esse serviço (ou só o informado, se já
  // vier com preferência).
  private async resolveProfessionals(companyId: string, serviceId: string, professionalId?: string): Promise<Professional[]> {
    const qb = this.professionalRepository
      .createQueryBuilder('p')
      .innerJoin('professional_services', 'ps', 'ps."professionalId" = p.id')
      .where('p.companyId = :companyId', { companyId })
      .andWhere('p.isActive = true')
      .andWhere('ps."serviceId" = :serviceId', { serviceId });
    if (professionalId) qb.andWhere('p.id = :professionalId', { professionalId });
    return qb.getMany();
  }

  async findAvailableSlots(
    companyId: string,
    params: { serviceId: string; professionalId?: string; from?: Date; to?: Date },
  ): Promise<AvailableSlot[]> {
    const service = await this.serviceRepository.findOne({ where: { id: params.serviceId, companyId } });
    if (!service) throw new NotFoundException('Serviço não encontrado');

    const professionals = await this.resolveProfessionals(companyId, params.serviceId, params.professionalId);
    if (professionals.length === 0) return [];

    const from = startOfDay(params.from ?? new Date());
    const to = params.to ?? addDays(from, DEFAULT_RANGE_DAYS);
    const professionalIds = professionals.map((p) => p.id);

    const [availabilities, timeOffs, existingAppointments] = await Promise.all([
      this.availabilityRepository.find({ where: { professionalId: In(professionalIds) } }),
      this.timeOffRepository.find({ where: { professionalId: In(professionalIds), date: In(this.datesBetween(from, to)) } }),
      this.appointmentRepository.find({
        where: {
          professionalId: In(professionalIds),
          status: In([AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED]),
          scheduledAt: Between(from, to),
        },
      }),
    ]);

    const slots: AvailableSlot[] = [];
    const professionalById = new Map(professionals.map((p) => [p.id, p]));
    const now = new Date();

    for (let day = new Date(from); day < to; day = addDays(day, 1)) {
      const weekday = day.getDay();
      const dateStr = this.toDateStr(day);

      for (const professional of professionals) {
        const dayAvailability = availabilities.filter((a) => a.professionalId === professional.id && a.weekday === weekday);
        if (dayAvailability.length === 0) continue;

        const dayTimeOffs = timeOffs.filter((t) => t.professionalId === professional.id && t.date === dateStr);
        const fullDayBlocked = dayTimeOffs.some((t) => !t.startTime && !t.endTime);
        if (fullDayBlocked) continue;

        const dayAppointments = existingAppointments.filter(
          (a) => a.professionalId === professional.id && this.toDateStr(a.scheduledAt) === dateStr,
        );

        for (const window of dayAvailability) {
          const windowStart = timeToMinutes(window.startTime);
          const windowEnd = timeToMinutes(window.endTime);

          for (let candidate = windowStart; candidate + service.durationMinutes <= windowEnd; candidate += SLOT_STEP_MINUTES) {
            const candidateEnd = candidate + service.durationMinutes;

            const blockedByTimeOff = dayTimeOffs.some((t) => {
              if (!t.startTime || !t.endTime) return false;
              const blockStart = timeToMinutes(t.startTime);
              const blockEnd = timeToMinutes(t.endTime);
              return candidate < blockEnd && blockStart < candidateEnd;
            });
            if (blockedByTimeOff) continue;

            const candidateStart = new Date(day);
            candidateStart.setHours(0, candidate, 0, 0);
            const candidateEndAt = new Date(day);
            candidateEndAt.setHours(0, candidateEnd, 0, 0);

            if (candidateStart <= now) continue;

            const conflicts = dayAppointments.some((appt) => {
              const apptEnd = new Date(appt.scheduledAt.getTime() + appt.durationMinutes * 60000);
              return candidateStart < apptEnd && appt.scheduledAt < candidateEndAt;
            });
            if (conflicts) continue;

            slots.push({ professionalId: professional.id, professionalName: professionalById.get(professional.id)!.name, startAt: candidateStart });
            if (slots.length >= MAX_SLOTS_RETURNED) break;
          }
          if (slots.length >= MAX_SLOTS_RETURNED) break;
        }
        if (slots.length >= MAX_SLOTS_RETURNED) break;
      }
      if (slots.length >= MAX_SLOTS_RETURNED) break;
    }

    return slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private datesBetween(from: Date, to: Date): string[] {
    const dates: string[] = [];
    for (let day = new Date(from); day < to; day = addDays(day, 1)) dates.push(this.toDateStr(day));
    return dates;
  }

  // Reaproveitada por criação manual e pela checagem final de createAppointment.
  private async hasConflict(
    professionalId: string,
    scheduledAt: Date,
    durationMinutes: number,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const end = new Date(scheduledAt.getTime() + durationMinutes * 60000);
    const qb = this.appointmentRepository
      .createQueryBuilder('a')
      .where('a.professionalId = :professionalId', { professionalId })
      .andWhere('a.status IN (:...statuses)', { statuses: [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED] })
      .andWhere('a.scheduledAt < :end', { end })
      .andWhere('(a.scheduledAt + (a.durationMinutes || \' minutes\')::interval) > :start', { start: scheduledAt });
    if (excludeAppointmentId) qb.andWhere('a.id != :excludeId', { excludeId: excludeAppointmentId });
    const count = await qb.getCount();
    return count > 0;
  }

  private async isBlockedByTimeOff(professionalId: string, scheduledAt: Date, durationMinutes: number): Promise<boolean> {
    const dateStr = this.toDateStr(scheduledAt);
    const timeOffs = await this.timeOffRepository.find({ where: { professionalId, date: dateStr } });
    if (timeOffs.length === 0) return false;
    const startMin = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
    const endMin = startMin + durationMinutes;
    return timeOffs.some((t) => {
      if (!t.startTime || !t.endTime) return true; // dia inteiro bloqueado
      const blockStart = timeToMinutes(t.startTime);
      const blockEnd = timeToMinutes(t.endTime);
      return startMin < blockEnd && blockStart < endMin;
    });
  }

  async createAppointment(companyId: string, dto: CreateAppointmentDto): Promise<Appointment> {
    const service = await this.serviceRepository.findOne({ where: { id: dto.serviceId, companyId } });
    if (!service) throw new NotFoundException('Serviço não encontrado');

    const professional = await this.professionalRepository.findOne({ where: { id: dto.professionalId, companyId } });
    if (!professional) throw new NotFoundException('Profissional não encontrado');

    const scheduledAt = new Date(dto.scheduledAt);

    if (await this.isBlockedByTimeOff(professional.id, scheduledAt, service.durationMinutes)) {
      throw new ConflictException('Profissional não atende nesse dia/horário');
    }
    if (await this.hasConflict(professional.id, scheduledAt, service.durationMinutes)) {
      throw new ConflictException('Esse horário acabou de ser ocupado — escolha outro');
    }

    const appointment = await this.appointmentRepository.save(
      this.appointmentRepository.create({
        companyId,
        contactId: dto.contactId,
        professionalId: professional.id,
        serviceId: service.id,
        scheduledAt,
        durationMinutes: service.durationMinutes,
        notes: dto.notes ?? null,
      }),
    );

    await this.notifyNewAppointment(companyId, appointment, professional, service);
    return this.findById(appointment.id, companyId);
  }

  async reschedule(id: string, companyId: string, dto: RescheduleAppointmentDto): Promise<Appointment> {
    const appointment = await this.findById(id, companyId);
    const professionalId = dto.professionalId ?? appointment.professionalId;
    if (!professionalId) throw new BadRequestException('Agendamento sem profissional — informe um pra reagendar');
    const scheduledAt = new Date(dto.scheduledAt);

    if (await this.isBlockedByTimeOff(professionalId, scheduledAt, appointment.durationMinutes)) {
      throw new ConflictException('Profissional não atende nesse dia/horário');
    }
    if (await this.hasConflict(professionalId, scheduledAt, appointment.durationMinutes, appointment.id)) {
      throw new ConflictException('Esse horário acabou de ser ocupado — escolha outro');
    }

    appointment.scheduledAt = scheduledAt;
    appointment.professionalId = professionalId;
    appointment.reminderSentAt = null; // reagendou, lembrete antigo não vale mais
    await this.appointmentRepository.save(appointment);
    return this.findById(id, companyId);
  }

  async cancel(id: string, companyId: string): Promise<Appointment> {
    const appointment = await this.findById(id, companyId);
    appointment.status = AppointmentStatus.CANCELLED;
    await this.appointmentRepository.save(appointment);
    return appointment;
  }

  private async notifyNewAppointment(companyId: string, appointment: Appointment, professional: Professional, service: Service): Promise<void> {
    const managers = await this.userRepository.find({ where: { companyId, role: In([UserRole.OWNER, UserRole.ADMIN]), isActive: true } });
    await Promise.all(
      managers.map((u) =>
        this.notificationRepository.save(
          this.notificationRepository.create({
            companyId,
            userId: u.id,
            title: 'Novo agendamento',
            body: `${service.name} com ${professional.name}`,
          }),
        ),
      ),
    );
  }

  // Usado pelo cron de lembrete — agendamentos cuja hora de disparo (23h-24h
  // antes do horário) já chegou e ainda não foram avisados.
  async findDueForReminder(now: Date): Promise<Appointment[]> {
    const windowStart = new Date(now.getTime() + 23 * 60 * 60000);
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60000);
    return this.appointmentRepository.find({
      where: {
        status: AppointmentStatus.SCHEDULED,
        scheduledAt: Between(windowStart, windowEnd),
        reminderSentAt: null as any,
      },
      relations: ['contact', 'professional', 'service'],
    });
  }
}
