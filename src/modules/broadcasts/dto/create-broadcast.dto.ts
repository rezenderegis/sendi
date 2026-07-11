import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class IntentRuleDto {
  @IsString()
  @MinLength(1)
  intent: string;

  @IsUUID()
  tagId: string;
}
import { BroadcastMode, BroadcastType } from '../broadcast.entity';

export class CreateBroadcastDto {
  @ApiProperty({ example: 'Promoção Julho 2025' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'uuid-do-numero-whatsapp' })
  @IsUUID()
  whatsappNumberId: string;

  @ApiProperty({ enum: BroadcastType, example: BroadcastType.TEXT })
  @IsEnum(BroadcastType)
  type: BroadcastType;

  @ApiPropertyOptional({ example: 'Olá! Temos uma oferta especial para você.' })
  @ValidateIf((o) => o.type === BroadcastType.TEXT)
  @IsString()
  @MinLength(1)
  message?: string;

  @ApiPropertyOptional({ example: 'promocao_julho' })
  @ValidateIf((o) => o.type === BroadcastType.TEMPLATE)
  @IsString()
  @MinLength(1)
  templateName?: string;

  @ApiPropertyOptional({ example: 'pt_BR' })
  @IsOptional()
  @IsString()
  templateLanguage?: string;

  @ApiPropertyOptional({ example: 'Você é um assistente de vendas especializado em [produto].' })
  @IsOptional()
  @IsString()
  campaignPrompt?: string;

  @ApiPropertyOptional({ type: [IntentRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntentRuleDto)
  intentRules?: IntentRuleDto[];

  @ApiPropertyOptional({ enum: BroadcastMode, default: BroadcastMode.STANDARD })
  @IsOptional()
  @IsEnum(BroadcastMode)
  mode?: BroadcastMode;
}

export class UpdateBroadcastDto {
  @ApiPropertyOptional({ example: 'Promoção Julho 2025' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'uuid-do-numero-whatsapp' })
  @IsOptional()
  @IsUUID()
  whatsappNumberId?: string;

  @ApiPropertyOptional({ enum: BroadcastType })
  @IsOptional()
  @IsEnum(BroadcastType)
  type?: BroadcastType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateLanguage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campaignPrompt?: string;

  @ApiPropertyOptional({ type: [IntentRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntentRuleDto)
  intentRules?: IntentRuleDto[];
}

export class AddRecipientsDto {
  @ApiPropertyOptional({ type: [String], example: ['uuid-contato-1', 'uuid-contato-2'] })
  @IsOptional()
  @IsUUID('4', { each: true })
  contactIds?: string[];

  @ApiPropertyOptional({ example: 'uuid-da-tag' })
  @IsOptional()
  @IsUUID()
  tagId?: string;
}
