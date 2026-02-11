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
  private readonly useResendApi: boolean;
  private readonly resendApiKey: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.isEnabled = this.configService.get<boolean>('email.enabled', false);
    this.fromAddress = this.configService.get<string>('email.from', 'noreply@example.com');
    this.fromName = this.configService.get<string>(
      'email.fromName',
      'Partner Collaboration Platform',
    );

    const host = this.configService.get<string>('email.host', '');
    this.useResendApi = host.includes('resend.com');
    this.resendApiKey = this.configService.get<string>('email.pass', '');

    if (this.isEnabled && !this.useResendApi) {
      this.initializeTransporter();
    }

    this.logger.log(`Email processor initialized (resendApi=${this.useResendApi})`);
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
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      this.logger.log('Email processor transporter initialized');
    } catch (error) {
      this.logger.error('Failed to initialize email processor transporter', error);
      this.transporter = null;
    }
  }

  private async sendViaResendApi(to: string, subject: string, html: string, text?: string, from?: string): Promise<string> {
    const fromField = from || `${this.fromName} <${this.fromAddress}>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromField,
        to: [to],
        subject,
        html,
        text: text || this.htmlToText(html),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend API error (${response.status}): ${errorBody}`);
    }

    const result = await response.json();
    return result.id;
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

    // Resend HTTP API mode
    if (this.useResendApi) {
      try {
        const emailId = await this.sendViaResendApi(to, subject, html, text, job.data.from);
        this.logger.log(`Email sent via Resend API (queue): id=${emailId} to ${to}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send email via Resend API to ${to}: ${error.message}`);
        throw error; // BullMQ will retry
      }
    }

    // SMTP mode: send actual email
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
