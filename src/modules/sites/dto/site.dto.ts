import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'slug deve conter só letras minúsculas, números e hífen' })
  slug: string;

  @IsString()
  content: string;
}

export class GenerateSiteHtmlDto {
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  prompt: string;
}

export class UpdateSiteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class UpdateSiteAdminDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  domain?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
