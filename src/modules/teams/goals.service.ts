import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductivityGoal, GoalMetric, GoalPeriod, GoalScope } from './productivity-goal.entity';
import { GoalMemberQuota } from './goal-member-quota.entity';
import { Team } from './team.entity';
import { ActivityType } from './activity-type.entity';
import { User, UserRole } from '../users/user.entity';
import { Contact } from '../contacts/contact.entity';
import { Message } from '../conversations/message.entity';
import { FollowOn, FollowOnStatus } from '../follow-ons/follow-on.entity';
import { TeamsService, RequestingUser } from './teams.service';
import { CreateGoalDto, UpdateGoalDto } from './dto/create-goal.dto';
import { periodRange } from './period.util';

const SYSTEM_METRIC_LABEL: Partial<Record<GoalMetric, string>> = {
  [GoalMetric.CONTACTS_CREATED]: 'Contatos cadastrados',
  [GoalMetric.FOLLOWUP_MESSAGES]: 'Mensagens de follow-up',
}

export interface GoalProgressItem {
  goalId: string;
  metric: GoalMetric;
  metricLabel: string;
  activityTypeId: string | null;
  period: GoalPeriod;
  target: number;
  current: number;
  percent: number;
}

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(ProductivityGoal)
    private readonly goalRepository: Repository<ProductivityGoal>,
    @InjectRepository(GoalMemberQuota)
    private readonly quotaRepository: Repository<GoalMemberQuota>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(FollowOn)
    private readonly followOnRepository: Repository<FollowOn>,
    @InjectRepository(ActivityType)
    private readonly activityTypeRepository: Repository<ActivityType>,
    private readonly teamsService: TeamsService,
  ) {}

  // Carrega todos os tipos de atividade da empresa (ativos e inativos — metas/
  // follow-ons antigos podem apontar pra um tipo já inativado, e o nome ainda
  // precisa aparecer certo).
  private async getActivityTypeNameMap(companyId: string): Promise<Map<string, string>> {
    const types = await this.activityTypeRepository.find({ where: { companyId } });
    return new Map(types.map((t) => [t.id, t.name]));
  }

  // ---------- Contagem de métricas (uma query por métrica, nunca N+1 por membro) ----------

  private async countMetric(
    companyId: string,
    goal: ProductivityGoal,
    userIds: string[],
    now: Date,
  ): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();
    const { metric, period } = goal;
    const { start, end } = periodRange(period, now);

    if (metric === GoalMetric.CONTACTS_CREATED) {
      const rows = await this.contactRepository
        .createQueryBuilder('c')
        .select('c."createdByUserId"', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('c."companyId" = :companyId', { companyId })
        .andWhere('c."createdByUserId" IN (:...userIds)', { userIds })
        .andWhere('c."createdAt" >= :start AND c."createdAt" < :end', { start, end })
        .groupBy('c."createdByUserId"')
        .getRawMany<{ userId: string; count: string }>();
      return new Map(rows.map((r) => [r.userId, Number(r.count)]));
    }

    if (metric === GoalMetric.FOLLOWUP_MESSAGES) {
      // "Conta uma vez por contato, por dia, por usuário" — Message não tem
      // contactId (só conversationId, que mapeia 1:1 pra um contato), então o
      // dedup usa conversationId no lugar. O dedup é sempre por dia-calendário,
      // mesmo numa meta semanal/mensal (soma os dias, não dedupa pro período todo).
      const rows: { userId: string; count: string }[] = await this.messageRepository.query(
        `
        SELECT "sentByUserId" AS "userId", COUNT(*) AS count
        FROM (
          SELECT DISTINCT "sentByUserId", "conversationId", date_trunc('day', "sentAt") AS day
          FROM messages
          WHERE "companyId" = $1
            AND "sentByUserId" = ANY($2::uuid[])
            AND direction = 'outbound'
            AND "sentAt" >= $3 AND "sentAt" < $4
        ) dedup
        GROUP BY "sentByUserId"
        `,
        [companyId, userIds, start, end],
      );
      return new Map(rows.map((r) => [r.userId, Number(r.count)]));
    }

    // metric === ACTIVITY — follow_ons concluídos de um tipo de atividade
    // específico (Tarefa/Reunião/Visita presencial/qualquer custom), sem
    // nenhuma lógica de "type" embutida: generaliza pra N tipos de uma vez.
    const rows = await this.followOnRepository
      .createQueryBuilder('f')
      .select('f."assignedUserId"', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('f."companyId" = :companyId', { companyId })
      .andWhere('f."assignedUserId" IN (:...userIds)', { userIds })
      .andWhere('f.status = :status', { status: FollowOnStatus.DONE })
      .andWhere('f."activityTypeId" = :activityTypeId', { activityTypeId: goal.activityTypeId })
      .andWhere('f."sentAt" >= :start AND f."sentAt" < :end', { start, end })
      .groupBy('f."assignedUserId"')
      .getRawMany<{ userId: string; count: string }>();
    return new Map(rows.map((r) => [r.userId, Number(r.count)]));
  }

  private toItem(goal: ProductivityGoal, current: number, activityTypeNames: Map<string, string>): GoalProgressItem {
    const metricLabel = SYSTEM_METRIC_LABEL[goal.metric]
      ?? (goal.activityTypeId ? activityTypeNames.get(goal.activityTypeId) : undefined)
      ?? '—';
    return {
      goalId: goal.id,
      metric: goal.metric,
      metricLabel,
      activityTypeId: goal.activityTypeId,
      period: goal.period,
      target: goal.targetCount,
      current,
      percent: Math.min(100, Math.round((current / goal.targetCount) * 100)),
    };
  }

  // Divisão igual com resto pros primeiros membros (ordem estável), pra soma
  // sempre bater com a meta da equipe; se houver cota customizada (tabela
  // goal_member_quotas preenchida), ela prevalece — membros fora dela ficam 0.
  private async effectiveQuotas(goal: ProductivityGoal, memberIds: string[]): Promise<Map<string, number>> {
    const overrides = await this.quotaRepository.find({ where: { goalId: goal.id } });
    if (overrides.length > 0) {
      const map = new Map(memberIds.map((id) => [id, 0]));
      for (const o of overrides) if (map.has(o.userId)) map.set(o.userId, o.quota);
      return map;
    }
    const map = new Map<string, number>();
    const n = memberIds.length;
    if (n === 0) return map;
    const base = Math.floor(goal.targetCount / n);
    const remainder = goal.targetCount % n;
    memberIds.forEach((id, idx) => map.set(id, base + (idx < remainder ? 1 : 0)));
    return map;
  }

  // ---------- Leitura de progresso ----------

  private async buildUserProgress(
    companyId: string,
    userId: string,
    period: GoalPeriod | undefined,
    now: Date,
    activityTypeNames: Map<string, string>,
  ) {
    const where: any = { companyId, scope: GoalScope.USER, userId };
    if (period) where.period = period;
    const goals = await this.goalRepository.find({ where });

    const items: GoalProgressItem[] = [];
    for (const goal of goals) {
      const counts = await this.countMetric(companyId, goal, [userId], now);
      items.push(this.toItem(goal, counts.get(userId) ?? 0, activityTypeNames));
    }

    const user = await this.userRepository.findOne({ where: { id: userId, companyId } });
    return { userId, teamId: user?.teamId ?? null, goals: items };
  }

  private async buildTeamProgress(
    companyId: string,
    team: Team,
    period: GoalPeriod | undefined,
    now: Date,
    activityTypeNames: Map<string, string>,
  ) {
    const members = await this.userRepository.find({
      where: { teamId: team.id, companyId, isActive: true },
      order: { name: 'ASC' },
    });
    const memberIds = members.map((m) => m.id);

    const where: any = { companyId, scope: GoalScope.TEAM, teamId: team.id };
    if (period) where.period = period;
    const teamGoals = await this.goalRepository.find({ where });

    const teamItems: GoalProgressItem[] = [];
    const memberItemsByUser = new Map<string, GoalProgressItem[]>(memberIds.map((id) => [id, []]));

    for (const goal of teamGoals) {
      const counts = await this.countMetric(companyId, goal, memberIds, now);
      const totalCurrent = [...counts.values()].reduce((sum, n) => sum + n, 0);
      teamItems.push(this.toItem(goal, totalCurrent, activityTypeNames));

      const quotas = await this.effectiveQuotas(goal, memberIds);
      for (const id of memberIds) {
        const target = quotas.get(id) ?? 0;
        const current = counts.get(id) ?? 0;
        memberItemsByUser.get(id)!.push({
          ...this.toItem(goal, current, activityTypeNames),
          target,
          percent: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
        });
      }
    }

    return {
      teamId: team.id,
      teamName: team.name,
      goals: teamItems,
      members: members.map((m) => ({ userId: m.id, userName: m.name, goals: memberItemsByUser.get(m.id) ?? [] })),
    };
  }

  private async buildAllTeamsProgress(
    companyId: string,
    period: GoalPeriod | undefined,
    now: Date,
    activityTypeNames: Map<string, string>,
  ) {
    const teams = await this.teamRepository.find({ where: { companyId }, relations: ['leader'] });
    const result = [];
    for (const team of teams) {
      const members = await this.userRepository.find({ where: { teamId: team.id, companyId, isActive: true } });
      const memberIds = members.map((m) => m.id);

      const where: any = { companyId, scope: GoalScope.TEAM, teamId: team.id };
      if (period) where.period = period;
      const teamGoals = await this.goalRepository.find({ where });

      const items: GoalProgressItem[] = [];
      for (const goal of teamGoals) {
        const counts = await this.countMetric(companyId, goal, memberIds, now);
        const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
        items.push(this.toItem(goal, total, activityTypeNames));
      }

      result.push({
        teamId: team.id,
        teamName: team.name,
        leaderName: team.leader?.name ?? null,
        memberCount: members.length,
        goals: items,
      });
    }
    return result;
  }

  async getProgress(companyId: string, requestingUser: RequestingUser, period?: GoalPeriod, teamIdFilter?: string) {
    const now = new Date();
    const activityTypeNames = await this.getActivityTypeNameMap(companyId);
    const me = await this.buildUserProgress(companyId, requestingUser.id, period, now, activityTypeNames);
    const isManager = requestingUser.role === UserRole.OWNER || requestingUser.role === UserRole.ADMIN;
    const result: { me: typeof me; team?: any; allTeams?: any } = { me };

    if (teamIdFilter) {
      const team = await this.teamRepository.findOne({ where: { id: teamIdFilter, companyId } });
      if (team && (isManager || team.leaderId === requestingUser.id)) {
        result.team = await this.buildTeamProgress(companyId, team, period, now, activityTypeNames);
      }
      return result;
    }

    if (isManager) {
      result.allTeams = await this.buildAllTeamsProgress(companyId, period, now, activityTypeNames);
      return result;
    }

    const ledTeam = await this.teamRepository.findOne({ where: { companyId, leaderId: requestingUser.id } });
    if (ledTeam) {
      result.team = await this.buildTeamProgress(companyId, ledTeam, period, now, activityTypeNames);
    }
    return result;
  }

  // ---------- CRUD de metas ----------

  async findAllForUser(companyId: string, requestingUser: RequestingUser): Promise<ProductivityGoal[]> {
    if (requestingUser.role === UserRole.OWNER || requestingUser.role === UserRole.ADMIN) {
      return this.goalRepository.find({ where: { companyId }, relations: ['activityType'], order: { createdAt: 'ASC' } });
    }

    const qb = this.goalRepository
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.activityType', 'activityType')
      .where('g."companyId" = :companyId', { companyId });
    const ledTeam = await this.teamRepository.findOne({ where: { companyId, leaderId: requestingUser.id } });

    if (!ledTeam) {
      qb.andWhere('g."userId" = :uid', { uid: requestingUser.id });
      return qb.orderBy('g."createdAt"', 'ASC').getMany();
    }

    const members = await this.userRepository.find({ where: { teamId: ledTeam.id, companyId } });
    const memberIds = members.map((m) => m.id);
    qb.andWhere(
      '(g."userId" = :uid OR g."teamId" = :tid OR g."userId" IN (:...memberIds))',
      { uid: requestingUser.id, tid: ledTeam.id, memberIds: memberIds.length ? memberIds : [requestingUser.id] },
    );
    return qb.orderBy('g."createdAt"', 'ASC').getMany();
  }

  private async findGoalOr404(id: string, companyId: string): Promise<ProductivityGoal> {
    const goal = await this.goalRepository.findOne({ where: { id, companyId } });
    if (!goal) throw new NotFoundException('Meta não encontrada');
    return goal;
  }

  private async assertCanManageUserGoal(companyId: string, requestingUser: RequestingUser, targetUserId: string): Promise<void> {
    if (requestingUser.role === UserRole.OWNER || requestingUser.role === UserRole.ADMIN) return;
    const targetUser = await this.userRepository.findOne({ where: { id: targetUserId, companyId } });
    const team = targetUser?.teamId
      ? await this.teamRepository.findOne({ where: { id: targetUser.teamId, companyId } })
      : null;
    if (!team || team.leaderId !== requestingUser.id) {
      throw new BadRequestException('Apenas admin/owner ou o líder da equipe pode configurar essa meta');
    }
  }

  private async assertCanManageGoal(companyId: string, requestingUser: RequestingUser, goal: ProductivityGoal): Promise<void> {
    if (goal.scope === GoalScope.TEAM) {
      await this.teamsService.assertCanManageTeam(companyId, requestingUser, goal.teamId!);
    } else {
      await this.assertCanManageUserGoal(companyId, requestingUser, goal.userId!);
    }
  }

  async createGoal(companyId: string, requestingUser: RequestingUser, dto: CreateGoalDto): Promise<ProductivityGoal> {
    if (dto.scope === GoalScope.USER) {
      if (!dto.userId) throw new BadRequestException('userId é obrigatório para meta de pessoa');
      await this.assertCanManageUserGoal(companyId, requestingUser, dto.userId);
    } else {
      if (!dto.teamId) throw new BadRequestException('teamId é obrigatório para meta de equipe');
      await this.teamsService.assertCanManageTeam(companyId, requestingUser, dto.teamId);
    }

    if (dto.metric === GoalMetric.ACTIVITY) {
      if (!dto.activityTypeId) throw new BadRequestException('activityTypeId é obrigatório para metric = activity');
      const activityType = await this.activityTypeRepository.findOne({ where: { id: dto.activityTypeId, companyId } });
      if (!activityType || !activityType.isActive) {
        throw new BadRequestException('Tipo de atividade inválido ou inativo');
      }
    }

    const goal = this.goalRepository.create({
      companyId,
      scope: dto.scope,
      userId: dto.scope === GoalScope.USER ? dto.userId! : null,
      teamId: dto.scope === GoalScope.TEAM ? dto.teamId! : null,
      metric: dto.metric,
      activityTypeId: dto.metric === GoalMetric.ACTIVITY ? dto.activityTypeId! : null,
      targetCount: dto.targetCount,
      period: dto.period,
    });

    try {
      return await this.goalRepository.save(goal);
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException('Já existe uma meta pra esse alvo/métrica/período — edite a existente');
      }
      throw err;
    }
  }

  async updateGoal(id: string, companyId: string, requestingUser: RequestingUser, dto: UpdateGoalDto): Promise<ProductivityGoal> {
    const goal = await this.findGoalOr404(id, companyId);
    await this.assertCanManageGoal(companyId, requestingUser, goal);
    goal.targetCount = dto.targetCount;
    const saved = await this.goalRepository.save(goal);
    // Cota customizada que não bate mais com a nova meta perde validade — volta pra divisão igual.
    await this.quotaRepository.delete({ goalId: id });
    return saved;
  }

  async deleteGoal(id: string, companyId: string, requestingUser: RequestingUser): Promise<void> {
    const goal = await this.findGoalOr404(id, companyId);
    await this.assertCanManageGoal(companyId, requestingUser, goal);
    await this.goalRepository.remove(goal);
  }

  async setQuotas(
    goalId: string,
    companyId: string,
    requestingUser: RequestingUser,
    items: { userId: string; quota: number }[],
  ): Promise<void> {
    const goal = await this.findGoalOr404(goalId, companyId);
    if (goal.scope !== GoalScope.TEAM || !goal.teamId) {
      throw new BadRequestException('Só metas de equipe têm cota por membro');
    }
    await this.teamsService.assertCanManageTeam(companyId, requestingUser, goal.teamId);

    const members = await this.userRepository.find({ where: { teamId: goal.teamId, companyId, isActive: true } });
    const memberIds = new Set(members.map((m) => m.id));
    for (const item of items) {
      if (!memberIds.has(item.userId)) {
        throw new BadRequestException('Todas as cotas precisam ser de membros atuais da equipe');
      }
    }
    if (items.length !== members.length) {
      throw new BadRequestException('Informe a cota de todos os membros da equipe');
    }
    const sum = items.reduce((s, i) => s + i.quota, 0);
    if (sum !== goal.targetCount) {
      throw new BadRequestException(`A soma das cotas (${sum}) precisa ser igual à meta da equipe (${goal.targetCount})`);
    }

    await this.quotaRepository.delete({ goalId });
    await this.quotaRepository.save(items.map((i) => this.quotaRepository.create({ goalId, userId: i.userId, quota: i.quota })));
  }

  async clearQuotas(goalId: string, companyId: string, requestingUser: RequestingUser): Promise<void> {
    const goal = await this.findGoalOr404(goalId, companyId);
    if (goal.scope === GoalScope.TEAM && goal.teamId) {
      await this.teamsService.assertCanManageTeam(companyId, requestingUser, goal.teamId);
    }
    await this.quotaRepository.delete({ goalId });
  }

  // ---------- Modelo "Receita Previsível" ----------

  async applyReceitaPrevisivelTemplate(companyId: string): Promise<{ created: number; skipped: number }> {
    const users = await this.userRepository.find({ where: { companyId, isActive: true } });
    const specs: { metric: GoalMetric; targetCount: number; period: GoalPeriod }[] = [
      { metric: GoalMetric.CONTACTS_CREATED, targetCount: 3, period: GoalPeriod.DAY },
      { metric: GoalMetric.FOLLOWUP_MESSAGES, targetCount: 3, period: GoalPeriod.DAY },
    ];

    let created = 0;
    let skipped = 0;
    for (const user of users) {
      for (const spec of specs) {
        const existing = await this.goalRepository.findOne({
          where: { companyId, scope: GoalScope.USER, userId: user.id, metric: spec.metric, period: spec.period },
        });
        if (existing) {
          skipped++;
          continue;
        }
        await this.goalRepository.save(
          this.goalRepository.create({
            companyId,
            scope: GoalScope.USER,
            userId: user.id,
            metric: spec.metric,
            targetCount: spec.targetCount,
            period: spec.period,
          }),
        );
        created++;
      }
    }
    return { created, skipped };
  }
}
