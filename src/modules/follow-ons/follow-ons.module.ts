import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { FollowOn } from './follow-on.entity';
import { AppNotification } from './notification.entity';
import { Conversation } from '../conversations/conversation.entity';
import { User } from '../users/user.entity';
import { FollowOnsService } from './follow-ons.service';
import { FollowOnsCronService } from './follow-ons-cron.service';
import { FollowOnsController, NotificationsController } from './follow-ons.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FollowOn, AppNotification, Conversation, User]),
    ScheduleModule.forRoot(),
    WhatsappModule,
  ],
  controllers: [FollowOnsController, NotificationsController],
  providers: [FollowOnsService, FollowOnsCronService],
  exports: [FollowOnsService],
})
export class FollowOnsModule {}
