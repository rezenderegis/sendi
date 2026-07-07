import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SavedMessagesService } from './saved-messages.service';
import { CreateSavedMessageDto, UpdateSavedMessageDto } from './dto/create-saved-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Saved Messages')
@Controller('saved-messages')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class SavedMessagesController {
  constructor(private readonly service: SavedMessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mensagens salvas' })
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.service.findAll(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar mensagem salva' })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateSavedMessageDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar mensagem salva' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateSavedMessageDto,
  ) {
    return this.service.update(id, companyId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover mensagem salva' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.delete(id, companyId);
  }
}
