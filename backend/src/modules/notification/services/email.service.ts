import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import {
  generateWelcomeEmailHtml,
  generateWelcomeEmailText,
} from '../templates/welcome.template';
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
  generatePartnerInvitationEmailHtml,
  generatePartnerInvitationEmailText,
} from '../templates/partner-invitation.template';
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

  constructor(private configService: ConfigService) {
    this.isEnabled = this.configService.get<boolean>('email.enabled', false);
    this.fromAddress = this.configService.get<string>('email.from', 'noreply@example.com');
    this.fromName = this.configService.get<string>(
      'email.fromName',
      'Partner Collaboration Platform',
    );

    if (this.isEnabled) {
      this.initializeTransporter();
    } else {
      this.logger.warn('Email sending is disabled. Emails will be logged to console only.');
    }
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

      this.logger.log('Email transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize email transporter', error);
      this.transporter = null;
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
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

    // Production mode: send actual email
    if (!this.transporter) {
      this.logger.error('Email transporter not available');
      return false;
    }

    try {
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
      this.logger.log(`Task assignment email sent to partner: ${partner.email} for task: ${task.id}`);
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
      this.logger.log(`Project invitation email sent to partner: ${partner.email} for project: ${project.id}`);
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
      this.logger.log(`Stakeholder added email sent to partner: ${partner.email} for project: ${project.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send stakeholder added email to ${partner.email}`, error);
      return false;
    }
  }

  /**
   * Send partner invitation email with magic link
   */
  async sendPartnerInvitationEmail(
    partner: Partner,
    invitationUrl: string,
    expiresAt: Date,
    invitedBy?: string,
  ): Promise<boolean> {
    const html = generatePartnerInvitationEmailHtml({ partner, invitationUrl, expiresAt, invitedBy });
    const text = generatePartnerInvitationEmailText({ partner, invitationUrl, expiresAt, invitedBy });

    try {
      const result = await this.sendEmail({
        to: partner.email,
        subject: '【Partner Hub】アカウント有効化のご案内',
        html,
        text,
      });
      this.logger.log(`Partner invitation email sent to: ${partner.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send partner invitation email to ${partner.email}`, error);
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
