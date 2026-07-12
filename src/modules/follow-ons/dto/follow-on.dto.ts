import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, IsArray } from 'class-validator';
import { FollowOnType } from '../follow-on.entity';

export class CreateFollowOnDto {
  @IsUUID()
  conversationId: string;

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
