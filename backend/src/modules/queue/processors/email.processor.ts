import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

@Processor('email', { concurrency: 5 })
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: Transporter | null = null;
  private readonly isEnabled: boolean;
  private readonly fromAddress: string;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.isEnabled = this.configService.get<boolean>('email.enabled', false);
    this.fromAddress = this.configService.get<string>('email.from', 'noreply@example.com');
    this.fromName = this.configService.get<string>(
      'email.fromName',
      'Partner Collaboration Platform',
    );

    if (this.isEnabled) {
      this.initializeTransporter();
    }

    this.logger.log('Email processor initialized');
  }

  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('email.host'),
        port: this.configService.get<number>('email.port'),
        secure: this.configService.get<boolean>('email.secure'),
        auth: {
          user: this.configService.get<string>('email.user'),
          pass: this.configService.get<string>('email.pass'),
        },
      });
      this.logger.log('Email processor transporter initialized');
    } catch (error) {
      this.logger.error('Failed to initialize email processor transporter', error);
      this.transporter = null;
    }
  }

  async process(job: Job<EmailJobData>): Promise<boolean> {
    const { to, subject, html, text } = job.data;

    this.logger.log(`Processing email job ${job.id}: to=${to}, subject=${subject}`);

    // Development mode: log to console only
    if (!this.isEnabled) {
      this.logger.log('========================================');
      this.logger.log('[DEV MODE] Email processed from queue:');
      this.logger.log(`To: ${to}`);
      this.logger.log(`Subject: ${subject}`);
      this.logger.log('--- Text Content ---');
      this.logger.log(text || '(HTML only)');
      this.logger.log('========================================');
      return true;
    }

    // Production mode: send actual email
    if (!this.transporter) {
      throw new Error('Email transporter not available');
    }

    try {
      const fromField = job.data.from || `"${this.fromName}" <${this.fromAddress}>`;
      const mailOptions = {
        from: fromField,
        to,
        subject,
        html,
        text: text || this.htmlToText(html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully via queue: ${info.messageId} to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error; // BullMQ will retry
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}
