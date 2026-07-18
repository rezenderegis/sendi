import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadBrand, LeadSource } from './lead.entity';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly repo: Repository<Lead>,
  ) {}

  create(
    name: string,
    email: string,
    phone: string,
    source: LeadSource = LeadSource.FORM,
    brand: LeadBrand = LeadBrand.SENDE,
  ): Promise<Lead> {
    return this.repo.save(this.repo.create({ name, email, phone, source, brand }));
  }

  findAll(): Promise<Lead[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }
}
