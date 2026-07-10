import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Botox' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 350.00 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  defaultPrice?: number;

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

  @ApiPropertyOptional({ example: 350.00 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  defaultPrice?: number | null;

  @ApiPropertyOptional({ example: 90 })
  @IsInt()
  @IsPositive()
  @IsOptional()
  repurchaseIntervalDays?: number | null;
}
