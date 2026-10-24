import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

// Cada campo é independente: ausente = não muda; null = limpa (devolve pra
// fila / remove delegação). Permite 4 operações no mesmo endpoint: transferir
// pra departamento, transferir pra pessoa, "pegar da fila" (assignedUserId
// setado mantendo departmentId) e devolver pra fila (assignedUserId: null).
export class TransferConversationDto {
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((o) => o.departmentId != null)
  @IsUUID()
  @IsOptional()
  departmentId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((o) => o.assignedUserId != null)
  @IsUUID()
  @IsOptional()
  assignedUserId?: string | null;
}
