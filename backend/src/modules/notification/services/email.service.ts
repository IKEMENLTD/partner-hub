import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { Reminder } from '../../reminder/entities/reminder.entity';
import { Task } from '../../task/entities/task.entity';
import { Project } from '../../project/entities/project.entity';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import {
  generateReminderEmailHtml,
  generateReminderEmailText,
} from '../templates/reminder.template';
import {
  generateEscalationEmailHtml,
  generateEscalationEmailText,
} from '../templates/escalation.template';
import { generateWelcomeEmailHtml, generateWelcomeEmailText } from '../templates/welcome.template';
import {
  generateTaskAssignmentEmailHtml,
  generateTaskAssignmentEmailText,
} from '../templates/task-assignment.template';
import {
  generateProjectInvitationEmailHtml,
  generateProjectInvitationEmailText,
} from '../templates/project-invitation.template';
import {
  generateStakeholderAddedEmailHtml,
  generateStakeholderAddedEmailText,
} from '../templates/stakeholder-added.template';
import {
  generateReportUrlEmailHtml,
  generateReportUrlEmailText,
} from '../templates/report-url.template';
import {
  generateContactSetupEmailHtml,
  generateContactSetupEmailText,
} from '../templates/contact-setup.template';
import { Partner } from '../../partner/entities/partner.entity';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly isEnabled: boolean;
  private readonly fromAddress: string;
  private readonly fromName: string;
  private readonly useResendApi: boolean;
  private readonly resendApiKey: string;

  constructor(
    private configService: ConfigService,
    @Optional() @InjectQueue('email') private readonly emailQueue: Queue | null,
  ) {
    this.isEnabled = this.configService.get<boolean>('email.enabled', false);
    this.fromAddress = this.configService.get<string>('email.from', 'noreply@example.com');
    this.fromName = this.configService.get<string>(
      'email.fromName',
      'Partner Collaboration Platform',
    );

    const host = this.configService.get<string>('email.host', '');
    this.useResendApi = host.includes('resend.com');
    this.resendApiKey = this.configService.get<string>('email.pass', '');

    if (this.isEnabled) {
      if (this.useResendApi) {
        this.logger.log('Email configured via Resend HTTP API (SMTP port blocked workaround)');
      } else {
        this.initializeTransporter();
      }
    } else {
      this.logger.warn('Email sending is disabled. Emails will be logged to console only.');
    }
  }

  private initializeTransporter(): void {
    try {
      const host = this.configService.get<string>('email.host');
      const port = this.configService.get<number>('email.port');
      const secure = this.configService.get<boolean>('email.secure');

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: this.configService.get<string>('email.user'),
          pass: this.configService.get<string>('email.pass'),
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      this.logger.log(`Email transporter initialized: host=${host}, port=${port}, secure=${secure}`);
    } catch (error) {
      this.logger.error('Failed to initialize email transporter', error);
      this.transporter = null;
    }
  }

  /**
   * Send a generic email via queue (non-blocking)
   * Falls back to direct send if queue is unavailable
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { to, subject, html, text } = options;
    const recipients = Array.isArray(to) ? to : [to];

    // No queue available — send directly
    if (!this.emailQueue) {
      return this.sendEmailDirect(options);
    }

    try {
      // Enqueue each recipient as a separate job
      for (const recipient of recipients) {
        await this.emailQueue.add('send', {
          to: recipient,
          subject,
          html,
          text,
          from: `"${this.fromName}" <${this.fromAddress}>`,
        });
      }
      this.logger.log(`Email job(s) enqueued: subject="${subject}", recipients=${recipients.join(', ')}`);
      return true;
    } catch (error) {
      this.logger.warn(`Failed to enqueue email, falling back to direct send: ${error.message}`);
      return this.sendEmailDirect(options);
    }
  }

  /**
   * Send via Resend HTTP API (bypasses SMTP port blocking on cloud providers)
   */
  private async sendViaResendApi(options: SendEmailOptions): Promise<boolean> {
    const { to, subject, html, text } = options;
    const recipients = Array.isArray(to) ? to : [to];

    this.logger.log(`Sending email via Resend API to ${recipients.join(', ')}, subject="${subject}"`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${this.fromName} <${this.fromAddress}>`,
        to: recipients,
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
    this.logger.log(`Email sent via Resend API: id=${result.id} to ${recipients.join(', ')}`);
    return true;
  }

  /**
   * Send a generic email directly (synchronous, blocking)
   * Used for test emails and as fallback when queue is unavailable
   */
  async sendEmailDirect(options: SendEmailOptions): Promise<boolean> {
    const { to, subject, html, text } = options;
    const recipients = Array.isArray(to) ? to.join(', ') : to;

    // Development mode: log to console only
    if (!this.isEnabled) {
      this.logger.log('========================================');
      this.logger.log('[DEV MODE] Email would be sent:');
      this.logger.log(`To: ${recipients}`);
      this.logger.log(`Subject: ${subject}`);
      this.logger.log('--- Text Content ---');
      this.logger.log(text || '(HTML only)');
      this.logger.log('========================================');
      return true;
    }

    // Resend HTTP API mode (bypasses SMTP port blocking)
    if (this.useResendApi) {
      return this.sendViaResendApi(options);
    }

    // SMTP mode: send actual email via nodemailer
    if (!this.transporter) {
      this.logger.error('Email transporter not available');
      return false;
    }

    try {
      this.logger.log(`Sending email to ${recipients}, subject="${subject}"`);
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromAddress}>`,
        to: recipients,
        subject,
        html,
        text: text || this.htmlToText(html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId} to ${recipients}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${recipients}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send a reminder notification email
   */
  async sendReminderEmail(
    reminder: Reminder,
    task: Task | null,
    recipients: UserProfile[],
  ): Promise<boolean[]> {
    const results: boolean[] = [];

    for (const recipient of recipients) {
      const recipientName = recipient.fullName || recipient.email;

      const html = generateReminderEmailHtml({
        reminder,
        task: task || undefined,
        recipientName,
      });

      const text = generateReminderEmailText({
        reminder,
        task: task || undefined,
        recipientName,
      });

      try {
        const result = await this.sendEmail({
          to: recipient.email,
          subject: `[Reminder] ${reminder.title}`,
          html,
          text,
        });
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to send reminder email to ${recipient.email}`, error);
        results.push(false);
      }
    }

    return results;
  }

  /**
   * Send an escalation notification email
   */
  async sendEscalationEmail(
    escalationReason: string,
    escalationLevel: string,
    project: Project,
    recipients: UserProfile[],
    additionalInfo?: string,
  ): Promise<boolean[]> {
    const results: boolean[] = [];

    for (const recipient of recipients) {
      const recipientName = recipient.fullName || recipient.email;

      const html = generateEscalationEmailHtml({
        escalationReason,
        escalationLevel,
        project,
        recipientName,
        additionalInfo,
      });

      const text = generateEscalationEmailText({
        escalationReason,
        escalationLevel,
        project,
        recipientName,
        additionalInfo,
      });

      try {
        const result = await this.sendEmail({
          to: recipient.email,
          subject: `[ESCALATION - ${escalationLevel.toUpperCase()}] ${project.name}`,
          html,
          text,
        });
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to send escalation email to ${recipient.email}`, error);
        results.push(false);
      }
    }

    return results;
  }

  /**
   * Send a welcome email to a new partner
   */
  async sendWelcomeEmail(partner: Partner, loginUrl?: string): Promise<boolean> {
    const html = generateWelcomeEmailHtml({ partner, loginUrl });
    const text = generateWelcomeEmailText({ partner, loginUrl });

    try {
      const result = await this.sendEmail({
        to: partner.email,
        subject: '【Partner Hub】パートナー登録完了のお知らせ',
        html,
        text,
      });
      this.logger.log(`Welcome email sent to partner: ${partner.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${partner.email}`, error);
      return false;
    }
  }

  /**
   * Send task assignment notification email to a partner
   */
  async sendTaskAssignmentEmail(
    task: Task,
    partner: Partner,
    assignedBy?: string,
  ): Promise<boolean> {
    const html = generateTaskAssignmentEmailHtml({ task, partner, assignedBy });
    const text = generateTaskAssignmentEmailText({ task, partner, assignedBy });

    try {
      const result = await this.sendEmail({
        to: partner.email,
        subject: `【Partner Hub】タスクが割り当てられました: ${task.title}`,
        html,
        text,
      });
      this.logger.log(
        `Task assignment email sent to partner: ${partner.email} for task: ${task.id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to send task assignment email to ${partner.email}`, error);
      return false;
    }
  }

  /**
   * Send project invitation email to a partner
   */
  async sendProjectInvitationEmail(
    project: Project,
    partner: Partner,
    invitedBy?: string,
    role?: string,
  ): Promise<boolean> {
    const html = generateProjectInvitationEmailHtml({ project, partner, invitedBy, role });
    const text = generateProjectInvitationEmailText({ project, partner, invitedBy, role });

    try {
      const result = await this.sendEmail({
        to: partner.email,
        subject: `【Partner Hub】プロジェクトに招待されました: ${project.name}`,
        html,
        text,
      });
      this.logger.log(
        `Project invitation email sent to partner: ${partner.email} for project: ${project.id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to send project invitation email to ${partner.email}`, error);
      return false;
    }
  }

  /**
   * Send stakeholder added notification email to a partner
   */
  async sendStakeholderAddedEmail(
    project: Project,
    partner: Partner,
    stakeholderRole: string,
    addedBy?: string,
  ): Promise<boolean> {
    const html = generateStakeholderAddedEmailHtml({ project, partner, stakeholderRole, addedBy });
    const text = generateStakeholderAddedEmailText({ project, partner, stakeholderRole, addedBy });

    try {
      const result = await this.sendEmail({
        to: partner.email,
        subject: `【Partner Hub】プロジェクト関係者として追加されました: ${project.name}`,
        html,
        text,
      });
      this.logger.log(
        `Stakeholder added email sent to partner: ${partner.email} for project: ${project.id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to send stakeholder added email to ${partner.email}`, error);
      return false;
    }
  }

  /**
   * Send report URL email to partner (for login-free reporting)
   */
  async sendReportUrlEmail(partner: Partner, reportUrl: string): Promise<boolean> {
    const html = generateReportUrlEmailHtml({ partner, reportUrl });
    const text = generateReportUrlEmailText({ partner, reportUrl });

    try {
      const result = await this.sendEmail({
        to: partner.email,
        subject: '【Partner Hub】進捗報告用URLのご案内',
        html,
        text,
      });
      this.logger.log(`Report URL email sent to partner: ${partner.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send report URL email to ${partner.email}`, error);
      return false;
    }
  }

  /**
   * Send contact setup email to partner (initial setup for notification preferences)
   */
  async sendContactSetupEmail(
    partner: Partner,
    setupUrl: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const html = generateContactSetupEmailHtml({ partner, setupUrl, expiresAt });
    const text = generateContactSetupEmailText({ partner, setupUrl, expiresAt });

    try {
      const result = await this.sendEmail({
        to: partner.email,
        subject: '【Partner Hub】連絡先の登録をお願いします',
        html,
        text,
      });
      this.logger.log(`Contact setup email sent to partner: ${partner.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send contact setup email to ${partner.email}`, error);
      return false;
    }
  }

  /**
   * Convert HTML to plain text (basic implementation)
   */
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

  /**
   * Verify transporter connection (useful for health checks)
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('Email transporter connection verified');
      return true;
    } catch (error) {
      this.logger.error('Email transporter connection verification failed', error);
      return false;
    }
  }
}
