import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ExternalActionMethod } from '../external-action.entity';

export class CreateExternalActionDto {
  @ApiProperty({ example: 'consultar_cep' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'Use esta ferramenta quando o cliente informar um CEP para validar o endereço' })
  @IsString()
  @MinLength(5)
  description: string;

  @ApiPropertyOptional({ enum: ExternalActionMethod, default: ExternalActionMethod.POST })
  @IsOptional()
  @IsEnum(ExternalActionMethod)
  method?: ExternalActionMethod;

  @ApiProperty({ example: 'https://viacep.com.br/ws/{{cep}}/json' })
  @IsUrl({ require_tld: false })
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  headersTemplate?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  bodyTemplate?: Record<string, any>;

  @ApiProperty({ example: { type: 'object', properties: { cep: { type: 'string' } }, required: ['cep'] } })
  @IsObject()
  parametersSchema: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 8000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(30000)
  timeoutMs?: number;
}

export class UpdateExternalActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(5)
  description?: string;

  @ApiPropertyOptional({ enum: ExternalActionMethod })
  @IsOptional()
  @IsEnum(ExternalActionMethod)
  method?: ExternalActionMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  headersTemplate?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  bodyTemplate?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parametersSchema?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Envie vazio ("") para remover o token salvo' })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(30000)
  timeoutMs?: number;
}

export class TestExternalActionDto {
  @ApiProperty({ enum: ExternalActionMethod })
  @IsEnum(ExternalActionMethod)
  method: ExternalActionMethod;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  headersTemplate?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  bodyTemplate?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Valores de exemplo para os placeholders {{chave}} do corpo/headers' })
  @IsOptional()
  @IsObject()
  sampleValues?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({ default: 8000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(30000)
  timeoutMs?: number;
}
