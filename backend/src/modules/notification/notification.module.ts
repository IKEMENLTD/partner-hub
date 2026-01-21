import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { SlackService } from './services/slack.service';
import { NotificationService } from './services/notification.service';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { NotificationChannel } from './entities/notification-channel.entity';
import { NotificationLog } from './entities/notification-log.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UserProfile, NotificationChannel, NotificationLog]),
  ],
  providers: [EmailService, SlackService, NotificationService],
  exports: [EmailService, SlackService, NotificationService],
})
export class NotificationModule {}
