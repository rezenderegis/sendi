import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/create-company.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsageService } from '../billing/usage.service';

@ApiTags('Companies')
@Controller('companies')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly usageService: UsageService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Dados da empresa logada' })
  getMyCompany(@CurrentUser('companyId') companyId: string) {
    return this.companiesService.findById(companyId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar empresa' })
  updateMyCompany(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(companyId, dto);
  }

  @Get('me/usage')
  @ApiOperation({ summary: 'Uso e gastos da empresa logada (saldo, limites por número, hoje/mês)' })
  getMyUsage(@CurrentUser('companyId') companyId: string) {
    return this.usageService.getUsageSummary(companyId);
  }

  @Get('me/usage/daily')
  @ApiOperation({ summary: 'Gasto diário (saída vs bot) dos últimos N dias' })
  getMyDailyUsage(@CurrentUser('companyId') companyId: string, @Query('days') days?: string) {
    return this.usageService.getDailyBreakdown(companyId, Number(days) || 30);
  }

  @Get('me/usage/by-type')
  @ApiOperation({ summary: 'Gasto por tipo de mensagem nos últimos N dias' })
  getMyUsageByType(@CurrentUser('companyId') companyId: string, @Query('days') days?: string) {
    return this.usageService.getTypeBreakdown(companyId, Number(days) || 30);
  }

  @Get('me/usage/extract')
  @ApiOperation({ summary: 'Extrato de saldo (créditos + débitos diários) dos últimos N dias' })
  getMyUsageExtract(@CurrentUser('companyId') companyId: string, @Query('days') days?: string) {
    return this.usageService.getBalanceExtract(companyId, Number(days) || 30);
  }
}
