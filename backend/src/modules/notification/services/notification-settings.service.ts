import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationSettings,
  DigestTime,
} from '../entities/notification-settings.entity';
import { UpdateNotificationSettingsDto } from '../dto/update-notification-settings.dto';

@Injectable()
export class NotificationSettingsService {
  private readonly logger = new Logger(NotificationSettingsService.name);

  constructor(
    @InjectRepository(NotificationSettings)
    private notificationSettingsRepository: Repository<NotificationSettings>,
  ) {}

  /**
   * ユーザーの通知設定を取得
   * 存在しない場合はデフォルト設定を作成
   */
  async getSettingsByUserId(userId: string): Promise<NotificationSettings> {
    let settings = await this.notificationSettingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      // デフォルト設定を作成
      settings = this.notificationSettingsRepository.create({
        userId,
        digestEnabled: true,
        digestTime: DigestTime.SEVEN,
        deadlineNotification: true,
        assigneeChangeNotification: true,
        mentionNotification: true,
        statusChangeNotification: true,
        reminderMaxCount: 3,
        emailNotification: true,
        pushNotification: true,
      });
      settings = await this.notificationSettingsRepository.save(settings);
      this.logger.log(`Created default notification settings for user: ${userId}`);
    }

    return settings;
  }

  /**
   * ユーザーの通知設定を更新
   */
  async updateSettings(
    userId: string,
    updateDto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    // 既存の設定を取得(なければ作成)
    let settings = await this.getSettingsByUserId(userId);

    // 設定を更新
    const updateData: Partial<NotificationSettings> = {};

    if (updateDto.digestEnabled !== undefined) {
      updateData.digestEnabled = updateDto.digestEnabled;
    }
    if (updateDto.digestTime !== undefined) {
      updateData.digestTime = updateDto.digestTime;
    }
    if (updateDto.deadlineNotification !== undefined) {
      updateData.deadlineNotification = updateDto.deadlineNotification;
    }
    if (updateDto.assigneeChangeNotification !== undefined) {
      updateData.assigneeChangeNotification = updateDto.assigneeChangeNotification;
    }
    if (updateDto.mentionNotification !== undefined) {
      updateData.mentionNotification = updateDto.mentionNotification;
    }
    if (updateDto.statusChangeNotification !== undefined) {
      updateData.statusChangeNotification = updateDto.statusChangeNotification;
    }
    if (updateDto.reminderMaxCount !== undefined) {
      updateData.reminderMaxCount = updateDto.reminderMaxCount;
    }
    if (updateDto.emailNotification !== undefined) {
      updateData.emailNotification = updateDto.emailNotification;
    }
    if (updateDto.pushNotification !== undefined) {
      updateData.pushNotification = updateDto.pushNotification;
    }

    // 更新を実行
    await this.notificationSettingsRepository.update(settings.id, updateData);

    // 更新後の設定を取得して返す
    const updatedSettings = await this.notificationSettingsRepository.findOne({
      where: { id: settings.id },
    });

    if (!updatedSettings) {
      throw new NotFoundException('Notification settings not found after update');
    }

    this.logger.log(`Updated notification settings for user: ${userId}`);
    return updatedSettings;
  }

  /**
   * 設定をレスポンス用にマップ
   */
  mapToResponse(settings: NotificationSettings) {
    return {
      id: settings.id,
      userId: settings.userId,
      digestEnabled: settings.digestEnabled,
      digestTime: settings.digestTime,
      deadlineNotification: settings.deadlineNotification,
      assigneeChangeNotification: settings.assigneeChangeNotification,
      mentionNotification: settings.mentionNotification,
      statusChangeNotification: settings.statusChangeNotification,
      reminderMaxCount: settings.reminderMaxCount,
      emailNotification: settings.emailNotification,
      pushNotification: settings.pushNotification,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
