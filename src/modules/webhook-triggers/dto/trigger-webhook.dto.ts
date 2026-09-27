import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TriggerTemplateDto {
  @ApiProperty({ example: 'boas_vindas_v1' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: 'pt_BR' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}

export class TriggerWebhookDto {
  @ApiProperty({ example: '5511999999999' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Nome do CampaignPrompt a usar — pelo menos promptName ou flowName é obrigatório' })
  @IsOptional()
  @IsString()
  promptName?: string;

  @ApiPropertyOptional({ description: 'Nome do Fluxo Guiado a iniciar imediatamente' })
  @IsOptional()
  @IsString()
  flowName?: string;

  @ApiPropertyOptional({ description: 'Mensagem de texto livre de abertura (só funciona dentro da janela de 24h)' })
  @IsOptional()
  @IsString()
  mensagem?: string;

  @ApiPropertyOptional({ type: TriggerTemplateDto, description: 'Alternativa a "mensagem" — obrigatório fora da janela de 24h' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TriggerTemplateDto)
  template?: TriggerTemplateDto;

  @ApiPropertyOptional({ description: 'Mesclado no metadata do contato antes de resolver {{placeholders}} da mensagem' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Evita disparo duplicado em caso de retry do sistema externo' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
