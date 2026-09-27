import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCampaignPromptDto {
  @ApiProperty({ example: 'Vendas - Produto X' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'Você é um assistente de vendas especializado em [produto].' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ type: [String], description: 'Nomes das Bot Tools habilitadas. Vazio/omitido = todas.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledToolNames?: string[] | null;

  @ApiPropertyOptional({ type: [String], description: 'Nomes dos fluxos (Fluxo Guiado) habilitados. Vazio/omitido = todos.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledFlowNames?: string[] | null;
}

export class UpdateCampaignPromptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledToolNames?: string[] | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledFlowNames?: string[] | null;
}
