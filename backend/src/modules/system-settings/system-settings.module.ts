import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSettings } from './entities/system-settings.entity';
import { SystemSettingsService } from './system-settings.service';
import { SystemSettingsController } from './system-settings.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemSettings]),
    NotificationModule,
  ],
  controllers: [SystemSettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
