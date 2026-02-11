import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSettings } from './entities/system-settings.entity';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(
    @InjectRepository(SystemSettings)
    private systemSettingsRepository: Repository<SystemSettings>,
  ) {}

  /**
   * 組織の設定を取得（存在しない場合は作成）
   */
  async getSettings(organizationId: string): Promise<SystemSettings> {
    let settings = await this.systemSettingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      // 設定が存在しない場合はデフォルト設定を作成
      settings = this.systemSettingsRepository.create({
        organizationId,
      });
      await this.systemSettingsRepository.save(settings);
      this.logger.log(`Created default system settings for organization: ${organizationId}`);
    }

    return settings;
  }

  /**
   * 組織の設定を更新
   */
  async updateSettings(
    organizationId: string,
    dto: UpdateSystemSettingsDto,
  ): Promise<SystemSettings> {
    const settings = await this.getSettings(organizationId);

    // 更新する項目のみ適用（型安全にマージ）
    Object.assign(settings, {
      ...(dto.slackWebhookUrl !== undefined && { slackWebhookUrl: dto.slackWebhookUrl }),
      ...(dto.slackNotifyEscalation !== undefined && {
        slackNotifyEscalation: dto.slackNotifyEscalation,
      }),
      ...(dto.slackNotifyDailySummary !== undefined && {
        slackNotifyDailySummary: dto.slackNotifyDailySummary,
      }),
      ...(dto.slackNotifyAllReminders !== undefined && {
        slackNotifyAllReminders: dto.slackNotifyAllReminders,
      }),
      ...(dto.twilioAccountSid !== undefined && { twilioAccountSid: dto.twilioAccountSid }),
      ...(dto.twilioAuthToken !== undefined && { twilioAuthToken: dto.twilioAuthToken }),
      ...(dto.twilioPhoneNumber !== undefined && { twilioPhoneNumber: dto.twilioPhoneNumber }),
    });

    await this.systemSettingsRepository.save(settings);
    this.logger.log(`Updated system settings for organization: ${organizationId}`);

    return settings;
  }

  /**
   * Slack Webhook URLを取得（案件のカスタム設定 > システムデフォルト）
   */
  async getSlackWebhookUrl(
    organizationId: string,
    customWebhookUrl?: string,
  ): Promise<string | null> {
    // カスタムURLが設定されている場合はそれを使用
    if (customWebhookUrl) {
      return customWebhookUrl;
    }

    // システムデフォルトを取得
    const settings = await this.systemSettingsRepository.findOne({
      where: { organizationId },
    });

    return settings?.slackWebhookUrl || null;
  }

  /**
   * Slack通知設定を取得
   */
  async getSlackNotifySettings(organizationId: string): Promise<{
    notifyEscalation: boolean;
    notifyDailySummary: boolean;
    notifyAllReminders: boolean;
  }> {
    const settings = await this.systemSettingsRepository.findOne({
      where: { organizationId },
    });

    return {
      notifyEscalation: settings?.slackNotifyEscalation ?? true,
      notifyDailySummary: settings?.slackNotifyDailySummary ?? true,
      notifyAllReminders: settings?.slackNotifyAllReminders ?? false,
    };
  }

  /**
   * Twilio設定を取得
   */
  async getTwilioSettings(organizationId: string): Promise<{
    accountSid: string | null;
    authToken: string | null;
    phoneNumber: string | null;
  }> {
    const settings = await this.systemSettingsRepository.findOne({
      where: { organizationId },
    });

    return {
      accountSid: settings?.twilioAccountSid || null,
      authToken: settings?.twilioAuthToken || null,
      phoneNumber: settings?.twilioPhoneNumber || null,
    };
  }

  /**
   * Slack Webhook URLのテスト送信
   */
  async testSlackWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ':white_check_mark: テスト送信成功！Slack連携が正常に設定されています。',
        }),
      });

      return response.ok;
    } catch (error) {
      this.logger.error(`Slack webhook test failed: ${error.message}`);
      return false;
    }
  }
}
