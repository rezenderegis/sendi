import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

class MemberQuotaItem {
  @IsUUID()
  userId: string;

  @IsInt()
  @Min(0)
  quota: number;
}

export class SetMemberQuotasDto {
  @ApiProperty({ type: [MemberQuotaItem] })
  @ValidateNested({ each: true })
  @Type(() => MemberQuotaItem)
  @ArrayMinSize(1)
  quotas: MemberQuotaItem[];
}
