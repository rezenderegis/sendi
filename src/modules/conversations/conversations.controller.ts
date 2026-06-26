import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { ConversationStatus } from './conversation.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class UpdateConversationDto {
  @ApiProperty({ enum: ConversationStatus })
  @IsEnum(ConversationStatus)
  status: ConversationStatus;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  assignedUserId?: string;
}

@ApiTags('Conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar conversas da empresa (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.conversationsService.findAll(
      companyId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes da conversa' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.conversationsService.findById(id, companyId);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Mensagens da conversa (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.conversationsService.findMessages(
      id,
      companyId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar status da conversa' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.conversationsService.updateStatus(
      id,
      companyId,
      dto.status,
      dto.assignedUserId,
    );
  }
}
