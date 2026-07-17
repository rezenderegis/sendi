import {
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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsArray, IsHexColor, IsInt, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { KanbanColumnsService } from './kanban-columns.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class CreateColumnDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ required: false, default: '#6B7280' })
  @IsHexColor()
  @IsOptional()
  color?: string;
}

class UpdateColumnDto {
  @ApiProperty({ required: false })
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsHexColor()
  @IsOptional()
  color?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  position?: number;
}

class ReorderDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}

@ApiTags('Kanban')
@Controller('kanban-columns')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class KanbanColumnsController {
  constructor(private readonly service: KanbanColumnsService) {}

  @Get()
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.service.findAll(companyId);
  }

  @Post()
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateColumnDto,
  ) {
    return this.service.create(companyId, dto.name, dto.color ?? '#6B7280');
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  reorder(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.service.reorder(companyId, dto.ids);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.service.update(id, companyId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.remove(id, companyId);
  }
}
