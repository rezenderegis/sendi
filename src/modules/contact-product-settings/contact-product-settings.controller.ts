import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactProductSettingsService } from './contact-product-settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsInt, Min } from 'class-validator';

class UpsertSettingDto {
  @IsInt()
  @Min(1)
  repurchaseIntervalDays: number;
}

@ApiTags('ContactProductSettings')
@Controller('contact-product-settings')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class ContactProductSettingsController {
  constructor(private readonly service: ContactProductSettingsService) {}

  @Get('contact/:contactId')
  @ApiOperation({ summary: 'Listar recorrências personalizadas do contato' })
  findByContact(
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.findByContact(contactId, companyId);
  }

  @Put('contact/:contactId/product/:productId')
  @ApiOperation({ summary: 'Criar ou atualizar recorrência personalizada' })
  upsert(
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpsertSettingDto,
  ) {
    return this.service.upsert(contactId, productId, companyId, dto.repurchaseIntervalDays);
  }

  @Delete('contact/:contactId/product/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover recorrência personalizada (volta ao padrão do produto)' })
  remove(
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.remove(contactId, productId, companyId);
  }
}
