import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignPrompt } from './campaign-prompt.entity';
import { CampaignPromptsService } from './campaign-prompts.service';
import { CampaignPromptsController } from './campaign-prompts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CampaignPrompt])],
  controllers: [CampaignPromptsController],
  providers: [CampaignPromptsService],
})
export class CampaignPromptsModule {}
