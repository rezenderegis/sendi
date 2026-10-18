import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { GoalsService } from './goals.service';
import { CreateGoalDto, UpdateGoalDto } from './dto/create-goal.dto';
import { SetMemberQuotasDto } from './dto/set-member-quotas.dto';
import { GoalPeriod } from './productivity-goal.entity';

@ApiTags('Goals')
@Controller('goals')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get('progress')
  getProgress(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query('period') period?: GoalPeriod,
    @Query('teamId') teamId?: string,
  ) {
    return this.goalsService.getProgress(companyId, { id: userId, role }, period, teamId);
  }

  @Get()
  findAll(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.goalsService.findAllForUser(companyId, { id: userId, role });
  }

  @Post()
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateGoalDto,
  ) {
    return this.goalsService.createGoal(companyId, { id: userId, role }, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.updateGoal(id, companyId, { id: userId, role }, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.goalsService.deleteGoal(id, companyId, { id: userId, role });
  }

  @Put(':id/quotas')
  setQuotas(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: SetMemberQuotasDto,
  ) {
    return this.goalsService.setQuotas(id, companyId, { id: userId, role }, dto.quotas);
  }

  @Delete(':id/quotas')
  clearQuotas(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.goalsService.clearQuotas(id, companyId, { id: userId, role });
  }

  @Post('templates/receita-previsivel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  applyTemplate(@CurrentUser('companyId') companyId: string) {
    return this.goalsService.applyReceitaPrevisivelTemplate(companyId);
  }
}
