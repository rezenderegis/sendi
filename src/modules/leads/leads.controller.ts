import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { LeadsService } from './leads.service';
import { LeadSource } from './lead.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class CreateLeadDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  phone: string;

  @ApiProperty({ enum: LeadSource, required: false })
  @IsEnum(LeadSource)
  @IsOptional()
  source?: LeadSource;
}

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto.name, dto.email, dto.phone, dto.source);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.leadsService.findAll();
  }
}
