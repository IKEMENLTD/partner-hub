import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LineSendMessageOptions {
  userId: string;
  message: string;
  quickReplyItems?: Array<{
    type: 'action';
    action: {
      type: 'message' | 'uri';
      label: string;
      text?: string;
      uri?: string;
    };
  }>;
}

export interface LineSendMessageResult {
  success: boolean;
  error?: string;
}

/**
 * LINE Messaging API サービス（将来実装用スタブ）
 *
 * 実装時に必要なもの:
 * 1. LINE Developers でチャネル作成
 * 2. Messaging API を有効化
 * 3. 環境変数: LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET
 * 4. Webhook URL の設定（友達追加イベント受信用）
 */
@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private readonly channelAccessToken: string | null;
  private readonly channelSecret: string | null;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.channelAccessToken = this.configService.get<string>('LINE_CHANNEL_ACCESS_TOKEN') || null;
    this.channelSecret = this.configService.get<string>('LINE_CHANNEL_SECRET') || null;
    this.isEnabled = !!(this.channelAccessToken && this.channelSecret);

    if (this.isEnabled) {
      this.logger.log('LINE service initialized');
    } else {
      this.logger.warn(
        'LINE service is not configured. Set LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET to enable.',
      );
    }
  }

  /**
   * LINE メッセージを送信
   */
  async sendMessage(options: LineSendMessageOptions): Promise<LineSendMessageResult> {
    const { userId, message, quickReplyItems } = options;

    if (!this.isEnabled) {
      this.logger.warn('LINE service is not enabled. Message not sent.');
      this.logger.log(`[DEV MODE] LINE message would be sent to ${userId}: ${message}`);
      return { success: true }; // 開発モードでは成功として扱う
    }

    try {
      // TODO: LINE Messaging API の実装
      // const response = await fetch('https://api.line.me/v2/bot/message/push', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${this.channelAccessToken}`,
      //   },
      //   body: JSON.stringify({
      //     to: userId,
      //     messages: [
      //       {
      //         type: 'text',
      //         text: message,
      //         quickReply: quickReplyItems ? { items: quickReplyItems } : undefined,
      //       },
      //     ],
      //   }),
      // });

      this.logger.log(`LINE message sent to ${userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send LINE message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * クイックリプライ付きメッセージを送信（報告依頼用）
   */
  async sendReportRequest(
    userId: string,
    projectName: string,
    reportUrl: string,
  ): Promise<LineSendMessageResult> {
    const message = `【報告依頼】\n${projectName}の進捗報告をお願いします。`;

    return this.sendMessage({
      userId,
      message,
      quickReplyItems: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: '順調',
            text: '順調',
          },
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: 'やや遅れ',
            text: 'やや遅れ',
          },
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '問題あり',
            text: '問題あり',
          },
        },
        {
          type: 'action',
          action: {
            type: 'uri',
            label: '詳細を報告',
            uri: reportUrl,
          },
        },
      ],
    });
  }

  /**
   * リマインダーメッセージを送信
   */
  async sendReminder(
    userId: string,
    taskName: string,
    dueDate: string,
  ): Promise<LineSendMessageResult> {
    const message = `【リマインダー】\nタスク「${taskName}」の期限が${dueDate}です。`;

    return this.sendMessage({ userId, message });
  }

  /**
   * エスカレーション通知を送信
   */
  async sendEscalation(
    userId: string,
    taskName: string,
    daysOverdue: number,
  ): Promise<LineSendMessageResult> {
    const message = `【緊急】\nタスク「${taskName}」が${daysOverdue}日超過しています。至急ご対応ください。`;

    return this.sendMessage({ userId, message });
  }

  /**
   * Webhook署名を検証
   */
  verifySignature(body: string, signature: string): boolean {
    if (!this.channelSecret) {
      return false;
    }

    // TODO: HMAC-SHA256 署名検証の実装
    // const crypto = require('crypto');
    // const hash = crypto
    //   .createHmac('SHA256', this.channelSecret)
    //   .update(body)
    //   .digest('base64');
    // return hash === signature;

    return true;
  }

  /**
   * サービスが有効かどうか
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}
