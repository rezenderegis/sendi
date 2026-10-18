import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateActivityTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateActivityTypeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
