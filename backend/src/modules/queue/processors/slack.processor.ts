import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { WebClient, ChatPostMessageResponse } from '@slack/web-api';

export interface SlackJobData {
  channelId: string;
  text: string;
  blocks?: any[];
  threadTs?: string;
}

@Processor('slack', { concurrency: 3 })
export class SlackProcessor extends WorkerHost {
  private readonly logger = new Logger(SlackProcessor.name);
  private client: WebClient | null = null;
  private readonly isDevelopment: boolean;

  constructor(private readonly configService: ConfigService) {
    super();
    const botToken = this.configService.get<string>('slack.botToken');
    this.isDevelopment = this.configService.get<boolean>('slack.isDevelopment', true);

    if (botToken && !this.isDevelopment) {
      this.client = new WebClient(botToken);
      this.logger.log('Slack processor WebClient initialized');
    }

    this.logger.log('Slack processor initialized');
  }

  async process(job: Job<SlackJobData>): Promise<{ success: boolean; messageTs?: string; error?: string }> {
    const { channelId, text, blocks, threadTs } = job.data;

    this.logger.log(`Processing slack job ${job.id}: channel=${channelId}`);

    // Development mode: log to console
    if (this.isDevelopment) {
      this.logger.log('=== Slack Message (Queue - Development Mode) ===');
      this.logger.log(`Channel: ${channelId}`);
      this.logger.log(`Text: ${text}`);
      if (blocks) {
        this.logger.log(`Blocks: ${JSON.stringify(blocks, null, 2)}`);
      }
      if (threadTs) {
        this.logger.log(`Thread: ${threadTs}`);
      }
      this.logger.log('================================================');

      return {
        success: true,
        messageTs: `dev-${Date.now()}`,
      };
    }

    if (!this.client) {
      throw new Error('Slack client not initialized');
    }

    try {
      const response: ChatPostMessageResponse = await this.client.chat.postMessage({
        channel: channelId,
        text,
        blocks,
        thread_ts: threadTs,
      });

      if (response.ok) {
        this.logger.log(`Slack message sent via queue to channel ${channelId}`);
        return {
          success: true,
          messageTs: response.ts,
        };
      } else {
        throw new Error(`Slack API error: ${response.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending Slack message: ${errorMessage}`);
      throw error; // BullMQ will retry
    }
  }
}
