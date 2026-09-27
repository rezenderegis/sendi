import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateFlowDto {
  @ApiProperty({ example: 'pesquisa_satisfacao' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'Use quando o cliente pedir para participar da pesquisa de satisfação' })
  @IsString()
  @MinLength(5)
  description: string;
}

export class UpdateFlowDto {
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

  @ApiPropertyOptional({ description: 'id do FlowStep que é o início do fluxo' })
  @IsOptional()
  @IsUUID()
  startStepId?: string | null;
}
