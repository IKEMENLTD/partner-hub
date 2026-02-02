import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsSendOptions {
  to: string;
  message: string;
}

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * SMS送信サービス（Twilio - 将来実装用スタブ）
 *
 * 実装時に必要なもの:
 * 1. Twilio アカウント作成
 * 2. 電話番号を取得
 * 3. 環境変数: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *
 * 注意: SMSは最終手段（コストが高い）
 * エスカレーションルールで7日以上超過の場合のみ使用を推奨
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly accountSid: string | null;
  private readonly authToken: string | null;
  private readonly phoneNumber: string | null;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') || null;
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || null;
    this.phoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || null;
    this.isEnabled = !!(this.accountSid && this.authToken && this.phoneNumber);

    if (this.isEnabled) {
      this.logger.log('SMS service (Twilio) initialized');
    } else {
      this.logger.warn(
        'SMS service is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to enable.',
      );
    }
  }

  /**
   * SMS を送信
   */
  async sendSms(options: SmsSendOptions): Promise<SmsSendResult> {
    const { to, message } = options;

    // 電話番号のフォーマット
    const formattedNumber = this.formatPhoneNumber(to);

    if (!this.isEnabled) {
      this.logger.warn('SMS service is not enabled. Message not sent.');
      this.logger.log(`[DEV MODE] SMS would be sent to ${formattedNumber}: ${message}`);
      return { success: true, messageId: `dev-${Date.now()}` };
    }

    try {
      // TODO: Twilio API の実装
      // const client = require('twilio')(this.accountSid, this.authToken);
      // const twilioMessage = await client.messages.create({
      //   body: message,
      //   from: this.phoneNumber,
      //   to: formattedNumber,
      // });

      this.logger.log(`SMS sent to ${formattedNumber}`);
      return { success: true, messageId: `placeholder-${Date.now()}` };
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * リマインダーSMSを送信
   */
  async sendReminder(to: string, taskName: string, dueDate: string): Promise<SmsSendResult> {
    const message = `【Partner Hub】タスク「${taskName}」の期限が${dueDate}です。ご確認ください。`;

    return this.sendSms({ to, message });
  }

  /**
   * エスカレーションSMSを送信（最終手段）
   */
  async sendEscalation(
    to: string,
    taskName: string,
    daysOverdue: number,
    contactUrl?: string,
  ): Promise<SmsSendResult> {
    let message = `【緊急】Partner Hub: タスク「${taskName}」が${daysOverdue}日超過しています。`;

    if (contactUrl) {
      message += ` 詳細: ${contactUrl}`;
    } else {
      message += ' 至急ご対応ください。';
    }

    return this.sendSms({ to, message });
  }

  /**
   * 電話番号を国際フォーマットに変換
   * 日本の番号を想定（例: 09012345678 → +819012345678）
   */
  private formatPhoneNumber(phone: string): string {
    // 既に + で始まっている場合はそのまま返す
    if (phone.startsWith('+')) {
      return phone;
    }

    // スペース、ハイフン、括弧を削除
    let cleaned = phone.replace(/[\s\-()]/g, '');

    // 日本の番号の場合、先頭の0を+81に置換
    if (cleaned.startsWith('0')) {
      cleaned = '+81' + cleaned.substring(1);
    }

    return cleaned;
  }

  /**
   * サービスが有効かどうか
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 電話番号が有効な形式かチェック
   */
  isValidPhoneNumber(phone: string): boolean {
    // 基本的な電話番号パターン（日本・国際）
    const pattern = /^[\d\s\-+()]+$/;

    if (!pattern.test(phone)) {
      return false;
    }

    // 数字のみを抽出して長さチェック
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }
}
