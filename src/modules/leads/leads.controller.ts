import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { LeadsService } from './leads.service';
import { LeadBrand, LeadSource } from './lead.entity';
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

  @ApiProperty({ enum: LeadBrand, required: false })
  @IsEnum(LeadBrand)
  @IsOptional()
  brand?: LeadBrand;
}

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto.name, dto.email, dto.phone, dto.source, dto.brand);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.leadsService.findAll();
  }
}
