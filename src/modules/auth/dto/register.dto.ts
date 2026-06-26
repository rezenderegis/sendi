import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Minha Empresa Ltda' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: 'empresa@email.com' })
  @IsEmail()
  companyEmail: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  userEmail: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
