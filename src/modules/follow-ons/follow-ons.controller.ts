import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../../common/guards/company-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FollowOnsService } from './follow-ons.service';
import { CreateFollowOnDto, UpdateFollowOnDto } from './dto/follow-on.dto';
import { FollowOnStatus } from './follow-on.entity';

@ApiTags('Follow-ons')
@Controller('follow-ons')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class FollowOnsController {
  constructor(private readonly service: FollowOnsService) {}

  @Post()
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFollowOnDto,
  ) {
    return this.service.create(companyId, userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('userId') userId?: string,
    @Query('status') status?: FollowOnStatus,
  ) {
    return this.service.findAll(companyId, { userId, status });
  }

  @Get('conversation/:conversationId')
  findByConversation(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.findByConversation(conversationId, companyId);
  }

  @Patch(':id/complete')
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.complete(id, companyId);
  }

  @Patch(':id/reopen')
  reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.reopen(id, companyId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateFollowOnDto,
  ) {
    return this.service.update(id, companyId, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.remove(id, companyId);
  }
}

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly service: FollowOnsService) {}

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.findAllNotifications(userId, companyId);
  }

  @Get('unread')
  findUnread(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.findUnreadNotifications(userId, companyId);
  }

  @Patch(':id/read')
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.markNotificationRead(id, userId);
  }

  @Patch('read-all')
  markAllRead(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.service.markAllNotificationsRead(userId, companyId);
  }
}
