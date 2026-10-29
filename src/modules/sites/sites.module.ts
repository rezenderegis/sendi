import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Site } from './site.entity';
import { Company } from '../companies/company.entity';
import { AiModule } from '../ai/ai.module';
import { SitesService } from './sites.service';
import { SitesController } from './sites.controller';
import { SitesPublicController } from './sites-public.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Site, Company]), AiModule],
  controllers: [SitesController, SitesPublicController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
