import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class CreateDealDto {
  @ApiProperty({ description: 'Contato ao qual esse negócio pertence' })
  @IsUUID()
  contactId: string;

  @ApiPropertyOptional({ description: 'Se não informado, é gerado a partir do nome do contato' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Raia do Kanban em que o negócio já entra' })
  @IsUUID()
  @IsOptional()
  kanbanColumnId?: string;

  @ApiPropertyOptional({ description: 'Valor estimado do negócio' })
  @IsNumber()
  @IsOptional()
  dealValue?: number;

  @ApiPropertyOptional({ description: 'Usuário dono do negócio' })
  @IsUUID()
  @IsOptional()
  dealOwnerId?: string;
}

export class UpdateDealDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Raia do Kanban — envie null para tirar da raia' })
  @ValidateIf((o) => o.kanbanColumnId != null)
  @IsUUID()
  @IsOptional()
  kanbanColumnId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Valor estimado do negócio' })
  @ValidateIf((o) => o.dealValue != null)
  @IsNumber()
  @IsOptional()
  dealValue?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Usuário dono do negócio' })
  @ValidateIf((o) => o.dealOwnerId != null)
  @IsUUID()
  @IsOptional()
  dealOwnerId?: string | null;
}

export class MarkDealLostDto {
  @ApiProperty({ example: 'Preço alto' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
