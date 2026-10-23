import { Body, Controller, Delete, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { UnregisterDeviceTokenDto } from './dto/unregister-device-token.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('device-token')
  @ApiOperation({ summary: 'Registra/atualiza o token de push do aparelho atual' })
  registerDeviceToken(@CurrentUser('id') userId: string, @Body() dto: RegisterDeviceTokenDto) {
    return this.notificationsService.registerDeviceToken(userId, dto.token, dto.platform, dto.soundEnabled ?? true);
  }

  @Delete('device-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove o token de push (ex: logout)' })
  unregisterDeviceToken(@Body() dto: UnregisterDeviceTokenDto) {
    return this.notificationsService.unregisterDeviceToken(dto.token);
  }
}
