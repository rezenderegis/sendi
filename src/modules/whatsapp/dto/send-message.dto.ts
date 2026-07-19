import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TemplateCategory {
  MARKETING = 'MARKETING',
  UTILITY = 'UTILITY',
  AUTHENTICATION = 'AUTHENTICATION',
}

export class SendMessageDto {
  @ApiProperty({ example: '5561984402868' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiPropertyOptional({ example: 'Olá! Como posso ajudar?', description: 'Obrigatório se type=text' })
  @ValidateIf((o) => o.type === 'text' || !o.type)
  @IsString()
  @IsNotEmpty()
  message?: string;

  @ApiProperty({ example: 'uuid-do-numero-cadastrado-no-sendi' })
  @IsUUID()
  whatsappNumberId: string;

  @ApiPropertyOptional({ example: 'text', enum: ['text', 'template'], default: 'text' })
  @IsIn(['text', 'template'])
  @IsOptional()
  type?: 'text' | 'template';

  @ApiPropertyOptional({ example: 'hello_world', description: 'Nome do template. Obrigatório se type=template' })
  @ValidateIf((o) => o.type === 'template')
  @IsString()
  @IsNotEmpty()
  templateName?: string;

  @ApiPropertyOptional({ example: 'pt_BR', description: 'Idioma do template' })
  @IsString()
  @IsOptional()
  templateLanguage?: string;

  @IsString()
  @IsOptional()
  campaignPrompt?: string;

  @IsUUID()
  @IsOptional()
  campaignBroadcastId?: string;

  @IsOptional()
  campaignExpiresAt?: Date;

  @IsUUID()
  @IsOptional()
  broadcastRecipientId?: string;

  @IsOptional()
  templateVariables?: string[];
}

export class UpdateWhatsappNumberDto {
  @ApiPropertyOptional({ example: 'Você é um assistente da Empresa X...' })
  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @ApiPropertyOptional({ example: 20, description: 'Quantidade de mensagens recentes enviadas ao LLM como contexto' })
  @IsOptional()
  botHistoryLimit?: number;
}

export class ConnectNumberDto {
  @ApiProperty({ example: '1145309178672013' })
  @IsString()
  @MinLength(10)
  phoneNumberId: string;

  @ApiProperty({ example: '2515805945513606' })
  @IsString()
  @MinLength(10)
  wabaId: string;

  @ApiProperty({ example: 'EAAxxxxxxxxx — token do painel Meta for Developers' })
  @IsString()
  @MinLength(20)
  accessToken: string;

  @ApiProperty({ example: '+5561984402868' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: 'Sendi Suporte' })
  @IsString()
  @IsNotEmpty()
  displayName: string;
}

export class CreateTemplateDto {
  @ApiProperty({ example: 'lembrete_reuniao', description: 'Somente minúsculas, números e underscore' })
  @IsString()
  @Matches(/^[a-z0-9_]+$/, { message: 'name deve conter apenas letras minúsculas, números e underscore' })
  @MaxLength(512)
  name: string;

  @ApiProperty({ example: 'pt_BR' })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({ enum: TemplateCategory })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @ApiProperty({ example: 'Olá {{1}}, passando pra lembrar da nossa reunião amanhã às {{2}}.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  bodyText: string;

  @ApiPropertyOptional({ example: 'Responda essa mensagem se precisar remarcar' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  footerText?: string;

  @ApiPropertyOptional({ example: 'Lembrete de reunião' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  headerText?: string;

  @ApiPropertyOptional({ example: ['João'], description: 'Valores de exemplo para cada {{n}} do corpo, na ordem — obrigatório se o corpo tiver variáveis' })
  @IsOptional()
  @IsString({ each: true })
  bodyExamples?: string[];

  @ApiPropertyOptional({ example: 'João', description: 'Valor de exemplo para a variável do cabeçalho, se houver' })
  @IsOptional()
  @IsString()
  headerExample?: string;
}
