import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from '../queue/queue.module';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { NotificationService } from './services/notification.service';
import { DigestService } from './services/digest.service';
import { NotificationSettingsService } from './services/notification-settings.service';
import { InAppNotificationService } from './services/in-app-notification.service';
import { NotificationSettingsController } from './notification-settings.controller';
import { InAppNotificationController } from './controllers/in-app-notification.controller';
import { ContactController } from './controllers/contact.controller';
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
    QueueModule.register(),
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
  controllers: [NotificationSettingsController, InAppNotificationController, ContactController],
  providers: [
    EmailService,
    SmsService,
    NotificationService,
    DigestService,
    NotificationSettingsService,
    InAppNotificationService,
    NotificationGateway,
  ],
  exports: [
    EmailService,
    SmsService,
    NotificationService,
    DigestService,
    NotificationSettingsService,
    InAppNotificationService,
    NotificationGateway,
  ],
})
export class NotificationModule {}
