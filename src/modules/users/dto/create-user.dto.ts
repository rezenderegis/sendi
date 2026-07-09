import { IsArray, IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'Maria Souza' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.AGENT })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ type: [String], description: 'IDs dos números permitidos (null = todos)' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  allowedNumberIds?: string[] | null;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  canConfigureBot?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  canSendBroadcast?: boolean;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  allowedNumberIds?: string[] | null;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  canConfigureBot?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  canSendBroadcast?: boolean;
}
