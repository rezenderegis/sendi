import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Professional } from './professional.entity';
import { Service } from './service.entity';
import { ProfessionalAvailability } from './professional-availability.entity';
import { ProfessionalTimeOff } from './professional-time-off.entity';
import { CreateProfessionalDto, CreateTimeOffDto, SetAvailabilityDto, UpdateProfessionalDto } from './dto/professional.dto';

@Injectable()
export class ProfessionalsService {
  constructor(
    @InjectRepository(Professional)
    private readonly professionalRepository: Repository<Professional>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(ProfessionalAvailability)
    private readonly availabilityRepository: Repository<ProfessionalAvailability>,
    @InjectRepository(ProfessionalTimeOff)
    private readonly timeOffRepository: Repository<ProfessionalTimeOff>,
  ) {}

  findAll(companyId: string): Promise<Professional[]> {
    return this.professionalRepository.find({
      where: { companyId },
      relations: ['services'],
      order: { createdAt: 'ASC' },
    });
  }

  async findById(id: string, companyId: string): Promise<Professional> {
    const professional = await this.professionalRepository.findOne({
      where: { id, companyId },
      relations: ['services'],
    });
    if (!professional) throw new NotFoundException('Profissional não encontrado');
    return professional;
  }

  async findDetail(id: string, companyId: string) {
    const professional = await this.findById(id, companyId);
    const [availability, timeOff] = await Promise.all([
      this.availabilityRepository.find({ where: { professionalId: id, companyId }, order: { weekday: 'ASC', startTime: 'ASC' } }),
      this.timeOffRepository.find({ where: { professionalId: id, companyId }, order: { date: 'ASC' } }),
    ]);
    return { ...professional, availability, timeOff };
  }

  create(companyId: string, dto: CreateProfessionalDto): Promise<Professional> {
    return this.professionalRepository.save(
      this.professionalRepository.create({ companyId, name: dto.name, specialty: dto.specialty ?? null }),
    );
  }

  async update(id: string, companyId: string, dto: UpdateProfessionalDto): Promise<Professional> {
    const professional = await this.findById(id, companyId);
    Object.assign(professional, dto);
    return this.professionalRepository.save(professional);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const professional = await this.findById(id, companyId);
    await this.professionalRepository.remove(professional);
  }

  async addService(professionalId: string, companyId: string, serviceId: string): Promise<void> {
    const professional = await this.findById(professionalId, companyId);
    const service = await this.serviceRepository.findOne({ where: { id: serviceId, companyId } });
    if (!service) throw new NotFoundException('Serviço não encontrado');
    if (!professional.services.some((s) => s.id === serviceId)) {
      professional.services.push(service);
      await this.professionalRepository.save(professional);
    }
  }

  async removeService(professionalId: string, companyId: string, serviceId: string): Promise<void> {
    const professional = await this.findById(professionalId, companyId);
    professional.services = professional.services.filter((s) => s.id !== serviceId);
    await this.professionalRepository.save(professional);
  }

  // Substitui a lista toda — mais simples que add/remove individual pra uma
  // lista pequena de intervalos semanais.
  async setAvailability(professionalId: string, companyId: string, dto: SetAvailabilityDto): Promise<ProfessionalAvailability[]> {
    await this.findById(professionalId, companyId);
    await this.availabilityRepository.delete({ professionalId, companyId });
    if (dto.slots.length === 0) return [];
    const rows = dto.slots.map((s) =>
      this.availabilityRepository.create({ professionalId, companyId, weekday: s.weekday, startTime: s.startTime, endTime: s.endTime }),
    );
    return this.availabilityRepository.save(rows);
  }

  async addTimeOff(professionalId: string, companyId: string, dto: CreateTimeOffDto): Promise<ProfessionalTimeOff> {
    await this.findById(professionalId, companyId);
    return this.timeOffRepository.save(
      this.timeOffRepository.create({
        professionalId,
        companyId,
        date: dto.date,
        startTime: dto.startTime ?? null,
        endTime: dto.endTime ?? null,
        reason: dto.reason ?? null,
      }),
    );
  }

  async removeTimeOff(professionalId: string, companyId: string, timeOffId: string): Promise<void> {
    await this.timeOffRepository.delete({ id: timeOffId, professionalId, companyId });
  }
}
