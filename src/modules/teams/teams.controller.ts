import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddTeamMemberDto, SetTeamLeaderDto, UpdateTeamDto } from './dto/update-team.dto';

@ApiTags('Teams')
@Controller('teams')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(companyId, dto);
  }

  @Get()
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.teamsService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('companyId') companyId: string) {
    const [team, members] = await Promise.all([
      this.teamsService.findById(id, companyId),
      this.teamsService.findMembers(id, companyId),
    ]);
    return { ...team, members };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.update(id, companyId, dto);
  }

  @Patch(':id/leader')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  setLeader(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: SetTeamLeaderDto,
  ) {
    return this.teamsService.setLeader(id, companyId, dto.leaderId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('companyId') companyId: string) {
    return this.teamsService.remove(id, companyId);
  }

  @Post(':id/members')
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') requestingUserId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: AddTeamMemberDto,
  ) {
    await this.teamsService.assertCanManageTeam(companyId, { id: requestingUserId, role }, id);
    await this.teamsService.addMember(id, companyId, dto.userId);
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') requestingUserId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    await this.teamsService.assertCanManageTeam(companyId, { id: requestingUserId, role }, id);
    await this.teamsService.removeMember(id, companyId, userId);
  }
}
