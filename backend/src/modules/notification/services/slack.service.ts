import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WebClient, ChatPostMessageResponse } from '@slack/web-api';
import { KnownBlock, Block } from '@slack/types';
import { Reminder } from '../../reminder/entities/reminder.entity';
import { Task } from '../../task/entities/task.entity';
import { Project } from '../../project/entities/project.entity';

export interface SlackMessageOptions {
  channelId: string;
  text: string;
  blocks?: (KnownBlock | Block)[];
  threadTs?: string;
  metadata?: Record<string, any>;
}

export interface SlackMessageResult {
  success: boolean;
  messageTs?: string;
  channelId?: string;
  error?: string;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private client: WebClient | null = null;
  private readonly isDevelopment: boolean;

  constructor(
    private readonly configService: ConfigService,
    @Optional() @InjectQueue('slack') private readonly slackQueue: Queue | null,
  ) {
    const botToken = this.configService.get<string>('slack.botToken');
    this.isDevelopment = this.configService.get<boolean>('slack.isDevelopment', true);

    if (botToken && !this.isDevelopment) {
      this.client = new WebClient(botToken);
      this.logger.log('Slack WebClient initialized');
    } else if (this.isDevelopment) {
      this.logger.log(
        'Slack service running in development mode - messages will be logged to console only',
      );
    } else {
      this.logger.warn('Slack bot token not configured');
    }
  }

  /**
   * Send a message to a Slack channel
   */
  async sendMessage(
    channelId: string,
    text: string,
    blocks?: (KnownBlock | Block)[],
  ): Promise<SlackMessageResult> {
    return this.sendMessageWithOptions({ channelId, text, blocks });
  }

  /**
   * Send a message with full options via queue (non-blocking)
   * Falls back to direct send if queue is unavailable
   */
  async sendMessageWithOptions(options: SlackMessageOptions): Promise<SlackMessageResult> {
    const { channelId, text, blocks, threadTs } = options;

    // No queue available — send directly
    if (!this.slackQueue) {
      return this.sendMessageDirect(options);
    }

    try {
      await this.slackQueue.add('send', {
        channelId,
        text,
        blocks,
        threadTs,
      });
      this.logger.log(`Slack message job enqueued: channel=${channelId}`);
      return {
        success: true,
        messageTs: `queued-${Date.now()}`,
        channelId,
      };
    } catch (error) {
      this.logger.warn(`Failed to enqueue Slack message, falling back to direct send: ${error.message}`);
      return this.sendMessageDirect(options);
    }
  }

  /**
   * Send a message directly (synchronous, blocking)
   * Used as fallback when queue is unavailable
   */
  async sendMessageDirect(options: SlackMessageOptions): Promise<SlackMessageResult> {
    const { channelId, text, blocks, threadTs } = options;

    // Development mode: log to console instead of sending
    if (this.isDevelopment) {
      this.logger.log('=== Slack Message (Development Mode) ===');
      this.logger.log(`Channel: ${channelId}`);
      this.logger.log(`Text: ${text}`);
      if (blocks) {
        this.logger.log(`Blocks: ${JSON.stringify(blocks, null, 2)}`);
      }
      if (threadTs) {
        this.logger.log(`Thread: ${threadTs}`);
      }
      this.logger.log('========================================');

      return {
        success: true,
        messageTs: `dev-${Date.now()}`,
        channelId,
      };
    }

    if (!this.client) {
      this.logger.error('Slack client not initialized');
      return {
        success: false,
        error: 'Slack client not initialized',
      };
    }

    try {
      const response: ChatPostMessageResponse = await this.client.chat.postMessage({
        channel: channelId,
        text,
        blocks,
        thread_ts: threadTs,
      });

      if (response.ok) {
        this.logger.log(`Message sent to channel ${channelId}`);
        return {
          success: true,
          messageTs: response.ts,
          channelId: response.channel,
        };
      } else {
        this.logger.error(`Failed to send message: ${response.error}`);
        return {
          success: false,
          error: response.error,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending Slack message: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send a reminder notification for a task
   */
  async sendReminderNotification(
    reminder: Reminder,
    task: Task,
    channelId: string,
  ): Promise<SlackMessageResult> {
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('ja-JP') : '未設定';

    const priorityEmoji = this.getPriorityEmoji(task.priority);
    const statusText = this.getStatusText(task.status);

    const blocks: KnownBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${priorityEmoji} タスクリマインダー`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${reminder.title}*\n${reminder.message || ''}`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*タスク名:*\n${task.title}`,
          },
          {
            type: 'mrkdwn',
            text: `*ステータス:*\n${statusText}`,
          },
          {
            type: 'mrkdwn',
            text: `*期限:*\n${dueDate}`,
          },
          {
            type: 'mrkdwn',
            text: `*進捗:*\n${task.progress}%`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'タスクを確認',
              emoji: true,
            },
            value: task.id,
            action_id: 'view_task',
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '完了にする',
              emoji: true,
            },
            value: task.id,
            action_id: 'complete_task',
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `送信日時: ${new Date().toLocaleString('ja-JP')}`,
          },
        ],
      },
    ];

    const text = `タスクリマインダー: ${task.title} - 期限: ${dueDate}`;

    return this.sendMessage(channelId, text, blocks);
  }

  /**
   * Send an escalation notification for a project
   */
  async sendEscalationNotification(
    escalation: { title: string; message: string; level: number },
    project: Project,
    channelId: string,
  ): Promise<SlackMessageResult> {
    const endDate = project.endDate
      ? new Date(project.endDate).toLocaleDateString('ja-JP')
      : '未設定';

    const levelEmoji = this.getEscalationLevelEmoji(escalation.level);
    const levelText = this.getEscalationLevelText(escalation.level);

    const blocks: KnownBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${levelEmoji} エスカレーション通知`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${escalation.title}*\n${escalation.message}`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*プロジェクト:*\n${project.name}`,
          },
          {
            type: 'mrkdwn',
            text: `*エスカレーションレベル:*\n${levelText}`,
          },
          {
            type: 'mrkdwn',
            text: `*期限:*\n${endDate}`,
          },
          {
            type: 'mrkdwn',
            text: `*進捗:*\n${project.progress}%`,
          },
          {
            type: 'mrkdwn',
            text: `*健全性スコア:*\n${project.healthScore}/100`,
          },
          {
            type: 'mrkdwn',
            text: `*ステータス:*\n${project.status}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'プロジェクトを確認',
              emoji: true,
            },
            value: project.id,
            action_id: 'view_project',
            style: 'danger',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'タスク一覧を見る',
              emoji: true,
            },
            value: project.id,
            action_id: 'view_project_tasks',
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `送信日時: ${new Date().toLocaleString('ja-JP')} | エスカレーションレベル: ${escalation.level}`,
          },
        ],
      },
    ];

    const text = `[${levelText}] ${escalation.title} - プロジェクト: ${project.name}`;

    return this.sendMessage(channelId, text, blocks);
  }

  /**
   * Send a simple text notification
   */
  async sendSimpleNotification(
    channelId: string,
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' = 'info',
  ): Promise<SlackMessageResult> {
    const emoji = this.getTypeEmoji(type);
    const color = this.getTypeColor(type);

    const blocks: KnownBlock[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${title}*\n${message}`,
        },
      },
    ];

    return this.sendMessage(channelId, `${title}: ${message}`, blocks);
  }

  private getPriorityEmoji(priority: string): string {
    const emojiMap: Record<string, string> = {
      critical: ':rotating_light:',
      high: ':red_circle:',
      medium: ':large_orange_circle:',
      low: ':large_green_circle:',
    };
    return emojiMap[priority] || ':white_circle:';
  }

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      todo: '未着手',
      in_progress: '進行中',
      review: 'レビュー中',
      done: '完了',
      blocked: 'ブロック中',
    };
    return statusMap[status] || status;
  }

  private getEscalationLevelEmoji(level: number): string {
    if (level >= 3) return ':rotating_light:';
    if (level >= 2) return ':warning:';
    return ':information_source:';
  }

  private getEscalationLevelText(level: number): string {
    if (level >= 3) return '緊急';
    if (level >= 2) return '重要';
    return '通常';
  }

  private getTypeEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
      info: ':information_source:',
      warning: ':warning:',
      error: ':x:',
      success: ':white_check_mark:',
    };
    return emojiMap[type] || ':bell:';
  }

  private getTypeColor(type: string): string {
    const colorMap: Record<string, string> = {
      info: '#36a64f',
      warning: '#ff9800',
      error: '#f44336',
      success: '#4caf50',
    };
    return colorMap[type] || '#808080';
  }
}
