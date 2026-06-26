import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyPlan } from '../company.entity';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Minha Empresa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'empresa@email.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: CompanyPlan })
  @IsEnum(CompanyPlan)
  @IsOptional()
  plan?: CompanyPlan;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'Minha Empresa Atualizada' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: CompanyPlan })
  @IsEnum(CompanyPlan)
  @IsOptional()
  plan?: CompanyPlan;
}
