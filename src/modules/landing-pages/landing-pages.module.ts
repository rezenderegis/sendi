import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandingPage } from './landing-page.entity';
import { LandingPagesService } from './landing-pages.service';
import { LandingPagesController } from './landing-pages.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LandingPage])],
  controllers: [LandingPagesController],
  providers: [LandingPagesService],
  exports: [LandingPagesService],
})
export class LandingPagesModule {}
