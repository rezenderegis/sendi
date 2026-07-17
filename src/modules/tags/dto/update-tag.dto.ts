import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class UpdateTagDto {
  @ApiPropertyOptional({ example: 'Urgente' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: '#ef4444' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color deve ser uma cor hex válida (ex: #ef4444)' })
  color?: string;
}
