import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Suporte' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;
}

export class AddDepartmentMemberDto {
  @IsUUID()
  userId: string;
}
