import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, RescheduleAppointmentDto } from './dto/appointment.dto';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @ApiQuery({ name: 'professionalId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('professionalId') professionalId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.appointmentsService.findAll(companyId, {
      professionalId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('available-slots')
  @ApiOperation({ summary: 'Horários livres pra um serviço (e opcionalmente um profissional específico)' })
  @ApiQuery({ name: 'serviceId', required: true })
  @ApiQuery({ name: 'professionalId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date' })
  availableSlots(
    @CurrentUser('companyId') companyId: string,
    @Query('serviceId', ParseUUIDPipe) serviceId: string,
    @Query('professionalId') professionalId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.appointmentsService.findAvailableSlots(companyId, {
      serviceId,
      professionalId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('companyId') companyId: string) {
    return this.appointmentsService.findById(id, companyId);
  }

  @Post()
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.createAppointment(companyId, dto);
  }

  @Patch(':id/reschedule')
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.reschedule(id, companyId, dto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('companyId') companyId: string) {
    return this.appointmentsService.cancel(id, companyId);
  }
}
