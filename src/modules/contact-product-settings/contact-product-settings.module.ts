import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactProductSetting } from './contact-product-setting.entity';
import { ContactProductSettingsService } from './contact-product-settings.service';
import { ContactProductSettingsController } from './contact-product-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ContactProductSetting])],
  controllers: [ContactProductSettingsController],
  providers: [ContactProductSettingsService],
  exports: [ContactProductSettingsService],
})
export class ContactProductSettingsModule {}
