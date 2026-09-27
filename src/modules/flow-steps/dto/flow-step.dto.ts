import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FlowStepType } from '../flow-step.entity';

export class SaveAsVariableDto {
  @ApiProperty({ example: 'nomeMae' })
  @Matches(/^[a-z0-9_]+$/, { message: 'name deve conter apenas letras minúsculas, números e underscore' })
  name: string;

  @ApiProperty({ enum: ['contact', 'conversation'] })
  @IsIn(['contact', 'conversation'])
  scope: 'contact' | 'conversation';
}

export class FlowStepGraphItemDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty({ enum: FlowStepType, default: FlowStepType.CHOICE })
  @IsIn(Object.values(FlowStepType))
  stepType: FlowStepType;

  @ApiProperty({ description: 'Shape depende de stepType — ver ChoiceConfig/TextConfig/ContentConfig/ConditionConfig/ActionConfig em flow-step.entity.ts' })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({ description: 'Só usado quando stepType é text | content | action (blocos lineares); ignorado em choice/condition' })
  @IsOptional()
  @IsUUID()
  nextStepId?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  positionY?: number;
}

export class SaveFlowGraphDto {
  @ApiProperty({ type: [FlowStepGraphItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowStepGraphItemDto)
  steps: FlowStepGraphItemDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  deletedIds?: string[];
}
