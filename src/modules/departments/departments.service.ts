import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity';
import { User } from '../users/user.entity';
import { Conversation } from '../conversations/conversation.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
  ) {}

  async findAll(companyId: string): Promise<(Department & { memberCount: number })[]> {
    const departments = await this.departmentRepository.find({
      where: { companyId },
      order: { createdAt: 'ASC' },
    });
    if (departments.length === 0) return [];

    const counts = await this.departmentRepository
      .createQueryBuilder('d')
      .innerJoin('department_members', 'dm', 'dm."departmentId" = d.id')
      .select('dm."departmentId"', 'departmentId')
      .addSelect('COUNT(*)', 'count')
      .where('d."companyId" = :companyId', { companyId })
      .groupBy('dm."departmentId"')
      .getRawMany<{ departmentId: string; count: string }>();
    const countByDepartment = new Map(counts.map((c) => [c.departmentId, Number(c.count)]));

    return departments.map((d) => Object.assign(d, { memberCount: countByDepartment.get(d.id) ?? 0 }));
  }

  async findById(id: string, companyId: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({ where: { id, companyId } });
    if (!department) throw new NotFoundException('Departamento não encontrado');
    return department;
  }

  async findMembers(departmentId: string, companyId: string): Promise<User[]> {
    await this.findById(departmentId, companyId);
    return this.userRepository
      .createQueryBuilder('u')
      .innerJoin('department_members', 'dm', 'dm."userId" = u.id')
      .where('dm."departmentId" = :departmentId', { departmentId })
      .andWhere('u."companyId" = :companyId', { companyId })
      .orderBy('u.name', 'ASC')
      .getMany();
  }

  // Versão leve usada pelo fluxo de notificação — evita carregar User inteiro.
  async findMemberIds(departmentId: string, companyId: string): Promise<string[]> {
    const rows = await this.userRepository
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .innerJoin('department_members', 'dm', 'dm."userId" = u.id')
      .where('dm."departmentId" = :departmentId', { departmentId })
      .andWhere('u."companyId" = :companyId', { companyId })
      .getRawMany<{ id: string }>();
    return rows.map((r) => r.id);
  }

  async create(companyId: string, dto: CreateDepartmentDto): Promise<Department> {
    const department = this.departmentRepository.create({ companyId, name: dto.name });
    return this.departmentRepository.save(department);
  }

  async update(id: string, companyId: string, dto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.findById(id, companyId);
    if (dto.name !== undefined) department.name = dto.name;
    return this.departmentRepository.save(department);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const department = await this.findById(id, companyId);
    await this.departmentRepository
      .createQueryBuilder()
      .delete()
      .from('department_members')
      .where('"departmentId" = :id', { id })
      .execute();
    await this.conversationRepository.update({ departmentId: id, companyId }, { departmentId: null });
    await this.departmentRepository.remove(department);
  }

  async addMember(departmentId: string, companyId: string, userId: string): Promise<void> {
    await this.findById(departmentId, companyId);
    const user = await this.assertUserInCompany(userId, companyId);
    await this.departmentRepository
      .createQueryBuilder()
      .insert()
      .into('department_members')
      .values({ departmentId, userId: user.id })
      .orIgnore()
      .execute();
  }

  async removeMember(departmentId: string, companyId: string, userId: string): Promise<void> {
    await this.findById(departmentId, companyId);
    await this.departmentRepository
      .createQueryBuilder()
      .delete()
      .from('department_members')
      .where('"departmentId" = :departmentId AND "userId" = :userId', { departmentId, userId })
      .execute();
  }

  private async assertUserInCompany(userId: string, companyId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId, companyId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }
}
