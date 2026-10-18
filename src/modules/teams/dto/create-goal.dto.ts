import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Min, ValidateIf } from 'class-validator';
import { GoalMetric, GoalPeriod, GoalScope } from '../productivity-goal.entity';

export class CreateGoalDto {
  @ApiProperty({ enum: GoalScope })
  @IsEnum(GoalScope)
  scope: GoalScope;

  @ApiPropertyOptional({ description: 'Obrigatório quando scope = user' })
  @ValidateIf((o) => o.scope === GoalScope.USER)
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Obrigatório quando scope = team' })
  @ValidateIf((o) => o.scope === GoalScope.TEAM)
  @IsUUID()
  teamId?: string;

  @ApiProperty({ enum: GoalMetric })
  @IsEnum(GoalMetric)
  metric: GoalMetric;

  @ApiPropertyOptional({ description: 'Obrigatório quando metric = activity' })
  @ValidateIf((o) => o.metric === GoalMetric.ACTIVITY)
  @IsUUID()
  activityTypeId?: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  targetCount: number;

  @ApiProperty({ enum: GoalPeriod })
  @IsEnum(GoalPeriod)
  period: GoalPeriod;
}

export class UpdateGoalDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  targetCount: number;
}
