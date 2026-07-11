import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignPrompt } from './campaign-prompt.entity';
import { PromptVersion } from './prompt-version.entity';
import { CampaignPromptsService } from './campaign-prompts.service';
import { CampaignPromptsController } from './campaign-prompts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignPrompt, PromptVersion])],
  controllers: [CampaignPromptsController],
  providers: [CampaignPromptsService],
})
export class CampaignPromptsModule {}
