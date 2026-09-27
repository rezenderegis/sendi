import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignPrompt } from './campaign-prompt.entity';
import { PromptVersion } from './prompt-version.entity';
import { Broadcast } from '../broadcasts/broadcast.entity';
import { AutomationRule } from '../automations/automation-rule.entity';
import { AutomationExecution } from '../automations/automation-execution.entity';
import { ConversationEvent } from '../conversations/conversation-event.entity';
import { CampaignPromptsService } from './campaign-prompts.service';
import { CampaignPromptsController } from './campaign-prompts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignPrompt, PromptVersion, Broadcast, AutomationRule, AutomationExecution, ConversationEvent])],
  controllers: [CampaignPromptsController],
  providers: [CampaignPromptsService],
})
export class CampaignPromptsModule {}
