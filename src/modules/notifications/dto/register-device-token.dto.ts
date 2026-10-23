import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { DevicePlatform } from '../device-token.entity';

export class RegisterDeviceTokenDto {
  @IsString()
  @MinLength(10)
  token: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;
}
