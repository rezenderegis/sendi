import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProfessionalDto {
  @ApiProperty({ example: 'Dra. Fernanda' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Dentista' })
  @IsString()
  @IsOptional()
  specialty?: string;
}

export class UpdateProfessionalDto {
  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AddProfessionalServiceDto {
  @IsUUID()
  serviceId: string;
}

class AvailabilitySlotDto {
  @ApiProperty({ example: 1, description: '0 = domingo ... 6 = sábado' })
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  endTime: string;
}

export class SetAvailabilityDto {
  @ApiProperty({ type: [AvailabilitySlotDto] })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots: AvailabilitySlotDto[];
}

export class CreateTimeOffDto {
  @ApiProperty({ example: '2026-12-25' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: '14:00', description: 'Omitido = bloqueia o dia inteiro' })
  @ValidateIf((o) => o.startTime != null)
  @IsString()
  @IsOptional()
  startTime?: string | null;

  @ApiPropertyOptional({ example: '17:00' })
  @ValidateIf((o) => o.endTime != null)
  @IsString()
  @IsOptional()
  endTime?: string | null;

  @ApiPropertyOptional({ example: 'Férias' })
  @IsString()
  @IsOptional()
  reason?: string;
}
