import { IsDateString, IsEmail, IsNotEmpty, IsObject, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: '5561984402868' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'José Santos' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'jose@email.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Acme Ltda' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Cliente VIP, prefere contato pela manhã' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'crm-12345' })
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateContactDto {
  @ApiPropertyOptional({ example: 'José Santos' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'jose@email.com' })
  @ValidateIf((o) => o.email != null)
  @IsEmail()
  @IsOptional()
  email?: string | null;

  @ApiPropertyOptional({ example: 'Acme Ltda' })
  @ValidateIf((o) => o.companyName != null)
  @IsString()
  @IsOptional()
  companyName?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @ValidateIf((o) => o.avatarUrl != null)
  @IsUrl()
  @IsOptional()
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: 'Cliente VIP, prefere contato pela manhã' })
  @ValidateIf((o) => o.notes != null)
  @IsString()
  @IsOptional()
  notes?: string | null;

  @ApiPropertyOptional({ example: 'crm-12345' })
  @ValidateIf((o) => o.externalId != null)
  @IsString()
  @IsOptional()
  externalId?: string | null;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @ValidateIf((o) => o.birthDate != null)
  @IsDateString()
  @IsOptional()
  birthDate?: string | null;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
