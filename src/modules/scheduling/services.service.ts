import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './service.entity';
import { Appointment } from './appointment.entity';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  findAll(companyId: string): Promise<Service[]> {
    return this.serviceRepository.find({ where: { companyId }, order: { createdAt: 'ASC' } });
  }

  async findById(id: string, companyId: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({ where: { id, companyId } });
    if (!service) throw new NotFoundException('Serviço não encontrado');
    return service;
  }

  create(companyId: string, dto: CreateServiceDto): Promise<Service> {
    return this.serviceRepository.save(this.serviceRepository.create({ companyId, ...dto }));
  }

  async update(id: string, companyId: string, dto: UpdateServiceDto): Promise<Service> {
    const service = await this.findById(id, companyId);
    Object.assign(service, dto);
    return this.serviceRepository.save(service);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const service = await this.findById(id, companyId);
    const inUse = await this.appointmentRepository.count({ where: { serviceId: id, companyId } });
    if (inUse > 0) {
      throw new BadRequestException('Esse serviço já tem agendamentos — inative em vez de excluir');
    }
    await this.serviceRepository.remove(service);
  }
}
