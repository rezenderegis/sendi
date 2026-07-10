import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { AutomationTriggerType } from '../automation-rule.entity';

export class CreateAutomationRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(AutomationTriggerType)
  type: AutomationTriggerType;

  @IsUUID()
  whatsappNumberId: string;

  @IsInt()
  @IsOptional()
  triggerOffsetDays?: number;

  @IsString()
  @IsNotEmpty()
  messageTemplate: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAutomationRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  whatsappNumberId?: string;

  @IsInt()
  @IsOptional()
  triggerOffsetDays?: number;

  @IsString()
  @IsOptional()
  messageTemplate?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
