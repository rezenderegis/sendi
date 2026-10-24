import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Suporte' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
