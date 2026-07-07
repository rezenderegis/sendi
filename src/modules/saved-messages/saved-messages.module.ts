import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedMessage } from './saved-message.entity';
import { SavedMessagesService } from './saved-messages.service';
import { SavedMessagesController } from './saved-messages.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SavedMessage])],
  controllers: [SavedMessagesController],
  providers: [SavedMessagesService],
})
export class SavedMessagesModule {}
