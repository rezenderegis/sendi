import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

export class CreateSavedMessageDto {
  @ApiProperty({ example: 'Follow-up pós-reunião' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'Olá {{nome}}, tudo bem? Gostaria de dar continuidade à nossa conversa...' })
  @IsString()
  @MinLength(1)
  content: string;
}

export class UpdateSavedMessageDto extends PartialType(CreateSavedMessageDto) {}
