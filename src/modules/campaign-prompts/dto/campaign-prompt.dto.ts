import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCampaignPromptDto {
  @ApiProperty({ example: 'Vendas - Produto X' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'Você é um assistente de vendas especializado em [produto].' })
  @IsString()
  @MinLength(1)
  content: string;
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
}
