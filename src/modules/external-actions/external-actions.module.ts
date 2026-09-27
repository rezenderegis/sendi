import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalAction } from './external-action.entity';
import { ExternalActionsService } from './external-actions.service';
import { ExternalActionsController } from './external-actions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalAction])],
  controllers: [ExternalActionsController],
  providers: [ExternalActionsService],
  exports: [ExternalActionsService],
})
export class ExternalActionsModule {}
