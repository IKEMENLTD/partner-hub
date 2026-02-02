import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, Not } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportSchedule, ScheduleFrequency } from '../entities/report-schedule.entity';
import { ReportRequest, RequestStatus } from '../entities/report-request.entity';
import { PartnerReportToken } from '../entities/partner-report-token.entity';
import { PartnerReportTokenService } from './partner-report-token.service';
import { EmailService } from '../../notification/services/email.service';
import { ConfigService } from '@nestjs/config';

interface EscalationConfig {
  days: number;
  level: number;
  action: string;
}

@Injectable()
export class ReportReminderService {
  private readonly logger = new Logger(ReportReminderService.name);

  // Escalation configuration: days overdue -> escalation level
  private readonly escalationLevels: EscalationConfig[] = [
    { days: 1, level: 1, action: 'first_reminder' },
    { days: 3, level: 2, action: 'second_reminder' },
    { days: 7, level: 3, action: 'escalation_manager' },
    { days: 14, level: 4, action: 'escalation_admin' },
  ];

  constructor(
    @InjectRepository(ReportSchedule)
    private scheduleRepository: Repository<ReportSchedule>,
    @InjectRepository(ReportRequest)
    private requestRepository: Repository<ReportRequest>,
    @InjectRepository(PartnerReportToken)
    private tokenRepository: Repository<PartnerReportToken>,
    private tokenService: PartnerReportTokenService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  /**
   * Process scheduled report requests (runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledRequests(): Promise<void> {
    this.logger.log('Processing scheduled report requests...');

    const now = new Date();

    // Find active schedules that are due
    const dueSchedules = await this.scheduleRepository.find({
      where: {
        isActive: true,
        nextSendAt: LessThan(now),
      },
      relations: ['partner'],
    });

    this.logger.log(`Found ${dueSchedules.length} due schedules`);

    for (const schedule of dueSchedules) {
      try {
        await this.processSchedule(schedule);
      } catch (error) {
        this.logger.error(`Failed to process schedule ${schedule.id}:`, error);
      }
    }
  }

  /**
   * Check and send reminders for overdue reports (runs every 4 hours)
   */
  @Cron('0 */4 * * *') // Every 4 hours
  async processReminders(): Promise<void> {
    this.logger.log('Processing report reminders...');

    const now = new Date();

    // Find pending requests that are overdue
    const overdueRequests = await this.requestRepository.find({
      where: {
        status: RequestStatus.PENDING,
        deadlineAt: LessThan(now),
      },
      relations: ['partner', 'project'],
    });

    this.logger.log(`Found ${overdueRequests.length} overdue requests`);

    for (const request of overdueRequests) {
      try {
        await this.processReminder(request);
      } catch (error) {
        this.logger.error(`Failed to process reminder for request ${request.id}:`, error);
      }
    }
  }

  /**
   * Process a single schedule and create a report request
   */
  private async processSchedule(schedule: ReportSchedule): Promise<void> {
    if (!schedule.partnerId) {
      this.logger.warn(`Schedule ${schedule.id} has no partner, skipping`);
      return;
    }

    // Calculate deadline
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + schedule.deadlineDays);

    // Create report request
    const request = this.requestRepository.create({
      organizationId: schedule.organizationId,
      scheduleId: schedule.id,
      partnerId: schedule.partnerId,
      projectId: schedule.projectId,
      deadlineAt: deadline,
      status: RequestStatus.PENDING,
    });

    await this.requestRepository.save(request);

    // Get or create token for partner
    let token = await this.tokenRepository.findOne({
      where: { partnerId: schedule.partnerId, isActive: true },
    });

    if (!token) {
      token = await this.tokenService.generateToken(
        schedule.partnerId,
        schedule.projectId ?? undefined,
      );
    }

    // Send email notification
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const reportUrl = this.tokenService.getReportUrl(token.token, frontendUrl);

    if (schedule.partner?.email) {
      await this.sendReportRequestEmail(
        schedule.partner.email,
        schedule.partner.name,
        reportUrl,
        deadline,
        schedule.name,
      );
    }

    // Update schedule with next send time
    schedule.lastSentAt = new Date();
    schedule.nextSendAt = this.calculateNextSendDate(schedule);
    await this.scheduleRepository.save(schedule);

    this.logger.log(`Created report request ${request.id} for schedule ${schedule.id}`);
  }

  /**
   * Process reminder for an overdue request
   */
  private async processReminder(request: ReportRequest): Promise<void> {
    const now = new Date();
    const daysOverdue = Math.floor(
      (now.getTime() - request.deadlineAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Determine the appropriate escalation level
    let targetLevel = 0;
    for (const config of this.escalationLevels) {
      if (daysOverdue >= config.days) {
        targetLevel = config.level;
      }
    }

    // Only send reminder if escalation level has increased
    if (targetLevel > request.escalationLevel) {
      const escalationConfig = this.escalationLevels.find((c) => c.level === targetLevel);

      // Get token for partner
      const token = await this.tokenRepository.findOne({
        where: { partnerId: request.partnerId, isActive: true },
      });

      if (token && request.partner?.email) {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
        const reportUrl = this.tokenService.getReportUrl(token.token, frontendUrl);

        await this.sendReminderEmail(
          request.partner.email,
          request.partner.name,
          reportUrl,
          daysOverdue,
          escalationConfig?.action || 'reminder',
        );
      }

      // Update request
      request.escalationLevel = targetLevel;
      request.reminderCount += 1;
      request.lastReminderAt = now;
      request.status = RequestStatus.OVERDUE;
      await this.requestRepository.save(request);

      this.logger.log(
        `Sent level ${targetLevel} reminder for request ${request.id} (${daysOverdue} days overdue)`,
      );
    }
  }

  /**
   * Calculate the next send date based on schedule frequency
   */
  private calculateNextSendDate(schedule: ReportSchedule): Date {
    const now = new Date();
    const next = new Date();

    // Parse time of day
    const [hours, minutes] = (schedule.timeOfDay || '09:00:00').split(':').map(Number);
    next.setHours(hours, minutes, 0, 0);

    switch (schedule.frequency) {
      case ScheduleFrequency.DAILY:
        // Next day at specified time
        next.setDate(now.getDate() + 1);
        break;

      case ScheduleFrequency.WEEKLY:
        // Next week on specified day
        const targetDay = schedule.dayOfWeek ?? 1; // Default to Monday
        const currentDay = now.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
        next.setDate(now.getDate() + daysUntilTarget);
        break;

      case ScheduleFrequency.BIWEEKLY:
        // Two weeks from now on specified day
        const biweeklyTargetDay = schedule.dayOfWeek ?? 1;
        const biweeklyCurrentDay = now.getDay();
        const daysUntilBiweekly = (biweeklyTargetDay - biweeklyCurrentDay + 7) % 7 || 7;
        next.setDate(now.getDate() + daysUntilBiweekly + 7);
        break;

      case ScheduleFrequency.MONTHLY:
        // Next month on specified day
        const targetDayOfMonth = schedule.dayOfMonth ?? 1;
        next.setMonth(now.getMonth() + 1);
        next.setDate(
          Math.min(targetDayOfMonth, this.getDaysInMonth(next.getFullYear(), next.getMonth())),
        );
        break;
    }

    return next;
  }

  /**
   * Get days in a month
   */
  private getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * Send report request email
   */
  private async sendReportRequestEmail(
    email: string,
    name: string,
    reportUrl: string,
    deadline: Date,
    scheduleName: string,
  ): Promise<void> {
    const deadlineStr = deadline.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    await this.emailService.sendEmail({
      to: email,
      subject: `【報告依頼】${scheduleName} - Partner Hub`,
      text: `${name} 様

進捗報告をお願いいたします。

スケジュール: ${scheduleName}
報告期限: ${deadlineStr}

以下のリンクから報告を送信してください：
${reportUrl}

「順調」の場合はワンクリックで報告完了できます。

ご不明な点がございましたら、担当者までお問い合わせください。

---
Partner Hub`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">進捗報告のお願い</h2>
          <p>${name} 様</p>
          <p>進捗報告をお願いいたします。</p>
          <table style="margin: 20px 0;">
            <tr>
              <td style="padding: 8px 16px 8px 0; color: #666;">スケジュール:</td>
              <td style="padding: 8px 0;">${scheduleName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 16px 8px 0; color: #666;">報告期限:</td>
              <td style="padding: 8px 0;"><strong>${deadlineStr}</strong></td>
            </tr>
          </table>
          <p style="margin: 24px 0;">
            <a href="${reportUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              報告を送信する
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">「順調」の場合はワンクリックで報告完了できます。</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px;">Partner Hub</p>
        </div>
      `,
    });
  }

  /**
   * Send reminder email
   */
  private async sendReminderEmail(
    email: string,
    name: string,
    reportUrl: string,
    daysOverdue: number,
    action: string,
  ): Promise<void> {
    const urgency = daysOverdue >= 7 ? '【至急】' : '【リマインダー】';
    const urgencyColor = daysOverdue >= 7 ? '#DC2626' : '#F59E0B';

    await this.emailService.sendEmail({
      to: email,
      subject: `${urgency}進捗報告が期限を超過しています - Partner Hub`,
      text: `${name} 様

進捗報告が期限を${daysOverdue}日超過しています。
至急、報告をお願いいたします。

以下のリンクから報告を送信してください：
${reportUrl}

「順調」の場合はワンクリックで報告完了できます。

ご不明な点がございましたら、担当者までお問い合わせください。

---
Partner Hub`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${urgencyColor}; color: white; padding: 12px 16px; border-radius: 8px 8px 0 0;">
            <strong>${urgency} 報告期限超過</strong>
          </div>
          <div style="border: 1px solid #eee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <p>${name} 様</p>
            <p>進捗報告が<strong style="color: ${urgencyColor};">${daysOverdue}日</strong>超過しています。</p>
            <p>至急、報告をお願いいたします。</p>
            <p style="margin: 24px 0;">
              <a href="${reportUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                今すぐ報告する
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">「順調」の場合はワンクリックで報告完了できます。</p>
          </div>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #999; font-size: 12px;">Partner Hub</p>
        </div>
      `,
    });
  }

  /**
   * Create a manual report request (not from schedule)
   */
  async createManualRequest(
    partnerId: string,
    organizationId: string | null,
    projectId: string | null,
    deadlineDays: number = 3,
  ): Promise<ReportRequest> {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + deadlineDays);

    const request = this.requestRepository.create({
      organizationId,
      partnerId,
      projectId,
      deadlineAt: deadline,
      status: RequestStatus.PENDING,
    });

    await this.requestRepository.save(request);

    this.logger.log(`Created manual report request ${request.id} for partner ${partnerId}`);

    return request;
  }

  /**
   * Mark request as submitted when report is received
   */
  async markRequestAsSubmitted(partnerId: string, reportId: string): Promise<void> {
    // Find the most recent pending request for this partner
    const request = await this.requestRepository.findOne({
      where: {
        partnerId,
        status: RequestStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (request) {
      request.status = RequestStatus.SUBMITTED;
      request.reportId = reportId;
      await this.requestRepository.save(request);

      this.logger.log(`Marked request ${request.id} as submitted with report ${reportId}`);
    }

    // Also check for overdue requests
    const overdueRequest = await this.requestRepository.findOne({
      where: {
        partnerId,
        status: RequestStatus.OVERDUE,
      },
      order: { createdAt: 'DESC' },
    });

    if (overdueRequest) {
      overdueRequest.status = RequestStatus.SUBMITTED;
      overdueRequest.reportId = reportId;
      await this.requestRepository.save(overdueRequest);

      this.logger.log(
        `Marked overdue request ${overdueRequest.id} as submitted with report ${reportId}`,
      );
    }
  }
}
