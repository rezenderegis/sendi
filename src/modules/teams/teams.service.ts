import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './team.entity';
import { User, UserRole } from '../users/user.entity';
import { ProductivityGoal } from './productivity-goal.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

export interface RequestingUser {
  id: string;
  role: UserRole;
}

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProductivityGoal)
    private readonly goalRepository: Repository<ProductivityGoal>,
  ) {}

  private isManager(role: UserRole): boolean {
    return role === UserRole.OWNER || role === UserRole.ADMIN;
  }

  // Líder não é um role — é leaderId === requestingUser.id da equipe em questão.
  async assertCanManageTeam(companyId: string, requestingUser: RequestingUser, teamId: string): Promise<Team> {
    const team = await this.findById(teamId, companyId);
    if (this.isManager(requestingUser.role)) return team;
    if (team.leaderId !== requestingUser.id) {
      throw new ForbiddenException('Apenas o líder da equipe ou um admin pode fazer isso');
    }
    return team;
  }

  async findAll(companyId: string): Promise<(Team & { memberCount: number })[]> {
    const teams = await this.teamRepository.find({
      where: { companyId },
      relations: ['leader'],
      order: { createdAt: 'ASC' },
    });
    if (teams.length === 0) return [];

    const counts = await this.userRepository
      .createQueryBuilder('u')
      .select('u."teamId"', 'teamId')
      .addSelect('COUNT(*)', 'count')
      .where('u."companyId" = :companyId', { companyId })
      .andWhere('u."teamId" IS NOT NULL')
      .andWhere('u."isActive" = true')
      .groupBy('u."teamId"')
      .getRawMany<{ teamId: string; count: string }>();
    const countByTeam = new Map(counts.map((c) => [c.teamId, Number(c.count)]));

    return teams.map((t) => Object.assign(t, { memberCount: countByTeam.get(t.id) ?? 0 }));
  }

  async findById(id: string, companyId: string): Promise<Team> {
    const team = await this.teamRepository.findOne({ where: { id, companyId }, relations: ['leader'] });
    if (!team) throw new NotFoundException('Equipe não encontrada');
    return team;
  }

  async findMembers(teamId: string, companyId: string): Promise<User[]> {
    return this.userRepository.find({ where: { teamId, companyId, isActive: true }, order: { name: 'ASC' } });
  }

  async create(companyId: string, dto: CreateTeamDto): Promise<Team> {
    if (dto.leaderId) await this.assertUserInCompany(dto.leaderId, companyId);
    const team = this.teamRepository.create({ companyId, name: dto.name, leaderId: dto.leaderId ?? null });
    return this.teamRepository.save(team);
  }

  async update(id: string, companyId: string, dto: UpdateTeamDto): Promise<Team> {
    const team = await this.findById(id, companyId);
    if (dto.name !== undefined) team.name = dto.name;
    if (dto.leaderId !== undefined) {
      if (dto.leaderId) await this.assertMember(dto.leaderId, id, companyId);
      team.leaderId = dto.leaderId;
    }
    return this.teamRepository.save(team);
  }

  async setLeader(id: string, companyId: string, leaderId: string): Promise<Team> {
    const team = await this.findById(id, companyId);
    await this.assertMember(leaderId, id, companyId);
    team.leaderId = leaderId;
    return this.teamRepository.save(team);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const team = await this.findById(id, companyId);
    await this.userRepository.update({ teamId: id, companyId }, { teamId: null });
    await this.goalRepository.delete({ teamId: id, companyId });
    await this.teamRepository.remove(team);
  }

  async addMember(teamId: string, companyId: string, userId: string): Promise<void> {
    await this.findById(teamId, companyId);
    const user = await this.assertUserInCompany(userId, companyId);
    user.teamId = teamId;
    await this.userRepository.save(user);
  }

  async removeMember(teamId: string, companyId: string, userId: string): Promise<void> {
    const user = await this.assertUserInCompany(userId, companyId);
    if (user.teamId !== teamId) throw new BadRequestException('Usuário não pertence a essa equipe');
    user.teamId = null;
    await this.userRepository.save(user);

    const team = await this.findById(teamId, companyId);
    if (team.leaderId === userId) {
      team.leaderId = null;
      await this.teamRepository.save(team);
    }
  }

  private async assertUserInCompany(userId: string, companyId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId, companyId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  private async assertMember(userId: string, teamId: string, companyId: string): Promise<void> {
    const user = await this.assertUserInCompany(userId, companyId);
    if (user.teamId !== teamId) {
      throw new BadRequestException('O líder precisa já ser membro da equipe');
    }
  }
}
