import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto, UpdateSaleDto } from './dto/create-sale.dto';
import { PaymentStatus } from './sale.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sales')
@Controller('sales')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar vendas da empresa' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('contactId') contactId?: string,
    @Query('productId') productId?: string,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.findAll(companyId, { contactId, productId, paymentStatus, startDate, endDate });
  }

  @Get('by-contact/:contactId')
  @ApiOperation({ summary: 'Vendas de um contato' })
  findByContact(
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.salesService.findByContact(contactId, companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da venda' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.salesService.findOne(id, companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar venda' })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar venda' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateSaleDto,
  ) {
    return this.salesService.update(id, companyId, dto);
  }

  @Patch(':id/mark-paid')
  @ApiOperation({ summary: 'Marcar como pago' })
  markAsPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.salesService.markAsPaid(id, companyId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir venda' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.salesService.delete(id, companyId);
  }

  @Post('import')
  @ApiOperation({ summary: 'Importar vendas via CSV ou XLSX' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async importSales(
    @CurrentUser('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    return this.salesService.importFromFile(file.buffer, file.mimetype, file.originalname, companyId);
  }
}
