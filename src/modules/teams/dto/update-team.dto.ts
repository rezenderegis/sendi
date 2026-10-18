import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class UpdateTeamDto {
  @ApiPropertyOptional({ example: 'Time Comercial SP' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((o) => o.leaderId != null)
  @IsUUID()
  @IsOptional()
  leaderId?: string | null;
}

export class AddTeamMemberDto {
  @IsUUID()
  userId: string;
}

export class SetTeamLeaderDto {
  @IsUUID()
  leaderId: string;
}
