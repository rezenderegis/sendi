import { IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlatformSettingsDto {
  @ApiPropertyOptional({ example: 5, description: 'Fallback: template com categoria desconhecida' })
  @IsOptional()
  @IsInt()
  @Min(0)
  costPerOutboundMessageCents?: number;

  @ApiPropertyOptional({ example: 3, description: 'Custo em centavos por mensagem respondida pelo bot' })
  @IsOptional()
  @IsInt()
  @Min(0)
  costPerBotMessageCents?: number;

  @ApiPropertyOptional({ example: 0, description: 'Texto livre (não-template) enviado pelo agente' })
  @IsOptional()
  @IsInt()
  @Min(0)
  costPerFreeTextMessageCents?: number;

  @ApiPropertyOptional({ example: 8, description: 'Template categoria MARKETING' })
  @IsOptional()
  @IsInt()
  @Min(0)
  costPerMarketingMessageCents?: number;

  @ApiPropertyOptional({ example: 5, description: 'Template categoria UTILITY' })
  @IsOptional()
  @IsInt()
  @Min(0)
  costPerUtilityMessageCents?: number;

  @ApiPropertyOptional({ example: 3, description: 'Template categoria AUTHENTICATION' })
  @IsOptional()
  @IsInt()
  @Min(0)
  costPerAuthenticationMessageCents?: number;
}

export class CreditBalanceDto {
  @ApiPropertyOptional({ example: 5000, description: 'Valor a creditar, em centavos' })
  @IsInt()
  amountCents: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SetNumberLimitsDto {
  @ApiPropertyOptional({ example: 2000, description: 'Limite diário em centavos, null remove o limite' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  dailySpendLimitCents?: number | null;

  @ApiPropertyOptional({ example: 30000, description: 'Limite mensal em centavos, null remove o limite' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  monthlySpendLimitCents?: number | null;
}
