import { IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
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

  @IsIn(['text', 'template'])
  @IsOptional()
  messageType?: 'text' | 'template';

  @ValidateIf((o) => !o.messageType || o.messageType === 'text')
  @IsString()
  @IsNotEmpty()
  messageTemplate?: string;

  @ValidateIf((o) => o.messageType === 'template')
  @IsString()
  @IsNotEmpty()
  templateName?: string;

  @IsString()
  @IsOptional()
  templateLanguage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  templateVariables?: string[];

  @IsUUID()
  @IsOptional()
  campaignPromptId?: string;

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

  @IsIn(['text', 'template'])
  @IsOptional()
  messageType?: 'text' | 'template';

  @IsString()
  @IsOptional()
  messageTemplate?: string;

  @IsString()
  @IsOptional()
  templateName?: string;

  @IsString()
  @IsOptional()
  templateLanguage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  templateVariables?: string[];

  @IsUUID()
  @IsOptional()
  campaignPromptId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
