import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsUUID()
  contactId: string;

  @ApiProperty()
  @IsUUID()
  serviceId: string;

  @ApiProperty()
  @IsUUID()
  professionalId: string;

  @ApiProperty({ description: 'ISO datetime' })
  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ description: 'ISO datetime' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ required: false, description: 'Omitido = mantém o mesmo profissional' })
  @IsUUID()
  @IsOptional()
  professionalId?: string;
}
