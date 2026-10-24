import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { ProfessionalsService } from './professionals.service';
import {
  AddProfessionalServiceDto,
  CreateProfessionalDto,
  CreateTimeOffDto,
  SetAvailabilityDto,
  UpdateProfessionalDto,
} from './dto/professional.dto';

@ApiTags('Professionals')
@Controller('professionals')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Get()
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.professionalsService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('companyId') companyId: string) {
    return this.professionalsService.findDetail(id, companyId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateProfessionalDto) {
    return this.professionalsService.create(companyId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateProfessionalDto,
  ) {
    return this.professionalsService.update(id, companyId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('companyId') companyId: string) {
    return this.professionalsService.remove(id, companyId);
  }

  @Post(':id/services')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  addService(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: AddProfessionalServiceDto,
  ) {
    return this.professionalsService.addService(id, companyId, dto.serviceId);
  }

  @Delete(':id/services/:serviceId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  removeService(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.professionalsService.removeService(id, companyId, serviceId);
  }

  @Put(':id/availability')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  setAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.professionalsService.setAvailability(id, companyId, dto);
  }

  @Post(':id/time-off')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  addTimeOff(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateTimeOffDto,
  ) {
    return this.professionalsService.addTimeOff(id, companyId, dto);
  }

  @Delete(':id/time-off/:timeOffId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  removeTimeOff(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('timeOffId', ParseUUIDPipe) timeOffId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.professionalsService.removeTimeOff(id, companyId, timeOffId);
  }
}
