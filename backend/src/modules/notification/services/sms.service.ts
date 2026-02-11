import { Injectable, Logger } from '@nestjs/common';
import Twilio from 'twilio';

export interface SmsSendOptions {
  to: string;
  message: string;
}

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  /**
   * SMS を送信
   */
  async sendSms(
    credentials: TwilioCredentials,
    options: SmsSendOptions,
  ): Promise<SmsSendResult> {
    const formattedNumber = this.formatPhoneNumber(options.to);

    if (!this.isValidPhoneNumber(formattedNumber)) {
      this.logger.warn(`Invalid phone number: ${options.to}`);
      return { success: false, error: '無効な電話番号です' };
    }

    try {
      const client = Twilio(credentials.accountSid, credentials.authToken);
      const message = await client.messages.create({
        body: options.message,
        from: credentials.phoneNumber,
        to: formattedNumber,
      });

      this.logger.log(`SMS sent to ${formattedNumber}, SID: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * エスカレーションSMSを送信（最終手段）
   */
  async sendEscalation(
    credentials: TwilioCredentials,
    to: string,
    taskName: string,
    daysOverdue: number,
  ): Promise<SmsSendResult> {
    const message = `【緊急】Partner Hub: タスク「${taskName}」が${daysOverdue}日超過しています。至急ご対応ください。`;
    return this.sendSms(credentials, { to, message });
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
   * 電話番号が有効な形式かチェック
   */
  isValidPhoneNumber(phone: string): boolean {
    const pattern = /^[\d\s\-+()]+$/;

    if (!pattern.test(phone)) {
      return false;
    }

    // 数字のみを抽出して長さチェック
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }
}
