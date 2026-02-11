import { Injectable, Logger } from '@nestjs/common';
import * as Twilio from 'twilio';

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
      return { success: false, error: this.translateError(error) };
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
   * Twilioエラーを日本語に変換
   */
  private translateError(error: any): string {
    const code = error.code;
    const errorMap: Record<number, string> = {
      20003: '認証エラー: Account SIDまたはAuth Tokenが正しくありません',
      20404: '無効なAccount SIDです',
      21211: '送信先の電話番号が無効です',
      21212: '送信元の電話番号が無効です',
      21214: '送信先と送信元に同じ番号は使用できません',
      21606: '送信元番号がSMS送信に対応していません',
      21608: '送信元番号はTwilioで購入した番号ではありません。Twilioコンソールで番号を購入してください',
      21610: '送信先がSMS受信を拒否しています',
      21614: '送信先が有効な携帯電話番号ではありません',
      21408: 'この地域へのSMS送信が許可されていません。TwilioコンソールのGeo Permissionsを確認してください',
      21612: '送信先と送信元に同じ番号は使用できません',
      21219: '送信元番号がSMS送信に対応していません',
      14101: 'トライアルアカウントでは、Verified Caller IDsに登録された番号にのみ送信できます',
    };

    if (code && errorMap[code]) {
      return errorMap[code];
    }

    // コードなしの場合、メッセージから判定
    const msg = error.message || '';
    if (msg.includes('cannot be the same')) {
      return '送信先と送信元に同じ番号は使用できません';
    }
    if (msg.includes('is not a Twilio phone number')) {
      return '送信元番号はTwilioで購入した番号ではありません。Twilioコンソールで番号を購入してください';
    }
    if (msg.includes('authenticate')) {
      return '認証エラー: Account SIDまたはAuth Tokenが正しくありません';
    }
    if (msg.includes('unverified')) {
      return 'トライアルアカウントでは、Verified Caller IDsに登録された番号にのみ送信できます';
    }

    return `SMS送信エラー: ${msg}`;
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
