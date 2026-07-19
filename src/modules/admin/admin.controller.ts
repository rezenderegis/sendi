import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { CreditBalanceDto, SetNumberLimitsDto, UpdatePlatformSettingsDto } from './dto/admin.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('companies')
  listCompanies() {
    return this.adminService.listCompanies();
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdatePlatformSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  @Post('companies/:id/balance/credit')
  creditBalance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreditBalanceDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.creditBalance(id, dto, adminUserId);
  }

  @Get('companies/:id/balance/history')
  getBalanceHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getBalanceHistory(id);
  }

  @Patch('whatsapp-numbers/:id/limits')
  setNumberLimits(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetNumberLimitsDto) {
    return this.adminService.setNumberLimits(id, dto);
  }

  @Get('whatsapp-numbers/:id/reconciliation')
  getReconciliation(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('since') since: string,
    @Query('until') until: string,
  ) {
    return this.adminService.getReconciliation(id, new Date(since), new Date(until));
  }
}
