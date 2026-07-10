import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Botox' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 90 })
  @IsInt()
  @IsPositive()
  @IsOptional()
  repurchaseIntervalDays?: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Botox' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 90 })
  @IsInt()
  @IsPositive()
  @IsOptional()
  repurchaseIntervalDays?: number;
}
