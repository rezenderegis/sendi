import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
