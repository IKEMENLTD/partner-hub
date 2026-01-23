import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { SlackService } from './services/slack.service';
import { NotificationService } from './services/notification.service';
import { DigestService } from './services/digest.service';
import { NotificationSettingsService } from './services/notification-settings.service';
import { InAppNotificationService } from './services/in-app-notification.service';
import { NotificationSettingsController } from './notification-settings.controller';
import { InAppNotificationController } from './controllers/in-app-notification.controller';
import { NotificationGateway } from './gateways/notification.gateway';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { NotificationChannel } from './entities/notification-channel.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { NotificationSettings } from './entities/notification-settings.entity';
import { InAppNotification } from './entities/in-app-notification.entity';
import { Task } from '../task/entities/task.entity';
import { Reminder } from '../reminder/entities/reminder.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      UserProfile,
      NotificationChannel,
      NotificationLog,
      NotificationSettings,
      InAppNotification,
      Task,
      Reminder,
    ]),
  ],
  controllers: [NotificationSettingsController, InAppNotificationController],
  providers: [
    EmailService,
    SlackService,
    NotificationService,
    DigestService,
    NotificationSettingsService,
    InAppNotificationService,
    NotificationGateway,
  ],
  exports: [
    EmailService,
    SlackService,
    NotificationService,
    DigestService,
    NotificationSettingsService,
    InAppNotificationService,
    NotificationGateway,
  ],
})
export class NotificationModule {}
