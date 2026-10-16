import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, IsArray } from 'class-validator';
import { FollowOnType } from '../follow-on.entity';

export class CreateFollowOnDto {
  @IsUUID()
  contactId: string;

  @IsEnum(FollowOnType)
  type: FollowOnType;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  // obrigatório para type === 'message' (de qual número disparar)
  @IsOptional()
  @IsUUID()
  whatsappNumberId?: string;

  // apenas para type === 'message'
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsString()
  templateLanguage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  templateVariables?: string[];
}

export class UpdateFollowOnDto {
  @IsOptional()
  @IsEnum(FollowOnType)
  type?: FollowOnType;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsUUID()
  whatsappNumberId?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsString()
  templateLanguage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  templateVariables?: string[];
}
