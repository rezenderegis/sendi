import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './team.entity';
import { ProductivityGoal } from './productivity-goal.entity';
import { GoalMemberQuota } from './goal-member-quota.entity';
import { ActivityType } from './activity-type.entity';
import { User } from '../users/user.entity';
import { Contact } from '../contacts/contact.entity';
import { Message } from '../conversations/message.entity';
import { FollowOn } from '../follow-ons/follow-on.entity';
import { TeamsController } from './teams.controller';
import { GoalsController } from './goals.controller';
import { ActivityTypesController } from './activity-types.controller';
import { TeamsService } from './teams.service';
import { GoalsService } from './goals.service';
import { ActivityTypesService } from './activity-types.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, ProductivityGoal, GoalMemberQuota, ActivityType, User, Contact, Message, FollowOn]),
  ],
  controllers: [TeamsController, GoalsController, ActivityTypesController],
  providers: [TeamsService, GoalsService, ActivityTypesService],
  exports: [TeamsService, GoalsService, ActivityTypesService],
})
export class TeamsModule {}
