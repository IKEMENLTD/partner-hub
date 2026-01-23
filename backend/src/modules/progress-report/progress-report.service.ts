import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ProgressReport } from './entities/progress-report.entity';
import { ProgressReportStatus } from './enums/progress-report-status.enum';
import { RequestReportDto } from './dto/request-report.dto';
import { SubmitReportDto } from './dto/submit-report.dto';
import { ReviewReportDto } from './dto/review-report.dto';
import { Task } from '../task/entities/task.entity';
import { EmailService } from '../notification/services/email.service';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { Project } from '../project/entities/project.entity';

@Injectable()
export class ProgressReportService {
  private readonly logger = new Logger(ProgressReportService.name);
  private readonly TOKEN_VALIDITY_HOURS = 24;

  constructor(
    @InjectRepository(ProgressReport)
    private progressReportRepository: Repository<ProgressReport>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    private emailService: EmailService,
  ) {}

  /**
   * Generate a unique report token for a task
   */
  async generateReportToken(
    taskId: string,
    partnerEmail: string,
    partnerName?: string,
  ): Promise<ProgressReport> {
    // Verify task exists
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // Generate token and expiry
    const reportToken = uuidv4();
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + this.TOKEN_VALIDITY_HOURS);

    // Create progress report entry
    const progressReport = this.progressReportRepository.create({
      taskId,
      reporterEmail: partnerEmail,
      reporterName: partnerName || partnerEmail,
      reportToken,
      tokenExpiresAt,
      progress: 0,
      status: ProgressReportStatus.PENDING,
      isSubmitted: false,
    });

    const savedReport = await this.progressReportRepository.save(progressReport);
    this.logger.log(`Generated report token for task ${taskId}, email: ${partnerEmail}`);

    return savedReport;
  }

  /**
   * Request a progress report from a partner
   */
  async requestReport(dto: RequestReportDto, requesterId: string): Promise<ProgressReport> {
    const { taskId, partnerEmail, partnerName } = dto;

    // Generate token
    const progressReport = await this.generateReportToken(taskId, partnerEmail, partnerName);

    // Get task details for email
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // Send email with report link
    await this.sendReportRequestEmail(progressReport, task);

    this.logger.log(`Report request sent to ${partnerEmail} for task ${taskId}`);
    return progressReport;
  }

  /**
   * Send report request email
   */
  private async sendReportRequestEmail(report: ProgressReport, task: Task): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const reportUrl = `${frontendUrl}/progress-report/${report.reportToken}`;

    const html = this.generateReportRequestEmailHtml({
      reporterName: report.reporterName,
      taskTitle: task.title,
      projectName: task.project?.name || 'Unknown Project',
      reportUrl,
      expiresAt: report.tokenExpiresAt,
    });

    const text = this.generateReportRequestEmailText({
      reporterName: report.reporterName,
      taskTitle: task.title,
      projectName: task.project?.name || 'Unknown Project',
      reportUrl,
      expiresAt: report.tokenExpiresAt,
    });

    await this.emailService.sendEmail({
      to: report.reporterEmail,
      subject: `[進捗報告リクエスト] ${task.title}`,
      html,
      text,
    });
  }

  /**
   * Get form data for a token (public endpoint)
   */
  async getFormData(token: string): Promise<{
    report: ProgressReport;
    task: Task;
  }> {
    const report = await this.progressReportRepository.findOne({
      where: { reportToken: token },
      relations: ['task', 'task.project'],
    });

    if (!report) {
      throw new NotFoundException('Invalid or expired report token');
    }

    // Check if token is expired
    if (new Date() > report.tokenExpiresAt) {
      throw new ForbiddenException('Report token has expired');
    }

    // Check if already submitted
    if (report.isSubmitted) {
      throw new BadRequestException('Report has already been submitted');
    }

    return {
      report,
      task: report.task,
    };
  }

  /**
   * Submit a progress report (public endpoint)
   */
  async submitReport(token: string, dto: SubmitReportDto): Promise<ProgressReport> {
    const report = await this.progressReportRepository.findOne({
      where: { reportToken: token },
      relations: ['task', 'task.project', 'task.project.owner'],
    });

    if (!report) {
      throw new NotFoundException('Invalid or expired report token');
    }

    // Check if token is expired
    if (new Date() > report.tokenExpiresAt) {
      throw new ForbiddenException('Report token has expired');
    }

    // Check if already submitted
    if (report.isSubmitted) {
      throw new BadRequestException('Report has already been submitted');
    }

    // Update report
    report.reporterName = dto.reporterName;
    report.progress = dto.progress;
    report.comment = dto.comment || null;
    report.attachmentUrls = dto.attachmentUrls || null;
    report.isSubmitted = true;

    const savedReport = await this.progressReportRepository.save(report);

    // Update task progress
    await this.taskRepository.update(report.taskId, {
      progress: dto.progress,
    });

    // Notify project owner
    await this.notifyProjectOwner(savedReport);

    this.logger.log(`Progress report submitted for task ${report.taskId}`);
    return savedReport;
  }

  /**
   * Notify project owner about new report
   */
  private async notifyProjectOwner(report: ProgressReport): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: report.taskId },
      relations: ['project', 'project.owner'],
    });

    if (!task?.project?.owner) {
      this.logger.warn(`No project owner found for task ${report.taskId}`);
      return;
    }

    const owner = task.project.owner;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const taskUrl = `${frontendUrl}/projects/${task.projectId}/tasks/${task.id}`;

    const html = this.generateReportReceivedEmailHtml({
      ownerName: owner.fullName || owner.email,
      reporterName: report.reporterName,
      taskTitle: task.title,
      projectName: task.project.name,
      progress: report.progress,
      comment: report.comment,
      taskUrl,
    });

    const text = this.generateReportReceivedEmailText({
      ownerName: owner.fullName || owner.email,
      reporterName: report.reporterName,
      taskTitle: task.title,
      projectName: task.project.name,
      progress: report.progress,
      comment: report.comment,
      taskUrl,
    });

    await this.emailService.sendEmail({
      to: owner.email,
      subject: `[進捗報告受信] ${task.title} - ${report.progress}%`,
      html,
      text,
    });
  }

  /**
   * Get all reports for a task
   */
  async getReportsByTask(taskId: string, includeUnsubmitted = false): Promise<ProgressReport[]> {
    const whereCondition: any = { taskId };

    if (!includeUnsubmitted) {
      whereCondition.isSubmitted = true;
    }

    return this.progressReportRepository.find({
      where: whereCondition,
      relations: ['reviewer'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Review a progress report
   */
  async reviewReport(
    reportId: string,
    dto: ReviewReportDto,
    reviewerId: string,
  ): Promise<ProgressReport> {
    const report = await this.progressReportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException(`Progress report with ID ${reportId} not found`);
    }

    if (!report.isSubmitted) {
      throw new BadRequestException('Cannot review an unsubmitted report');
    }

    report.status = dto.status;
    report.reviewerComment = dto.reviewerComment || null;
    report.reviewerId = reviewerId;
    report.reviewedAt = new Date();

    const savedReport = await this.progressReportRepository.save(report);
    this.logger.log(`Progress report ${reportId} reviewed by ${reviewerId}`);

    return savedReport;
  }

  /**
   * Get a single report by ID
   */
  async getReportById(reportId: string): Promise<ProgressReport> {
    const report = await this.progressReportRepository.findOne({
      where: { id: reportId },
      relations: ['task', 'task.project', 'reviewer'],
    });

    if (!report) {
      throw new NotFoundException(`Progress report with ID ${reportId} not found`);
    }

    return report;
  }

  /**
   * Clean up expired tokens (can be called by a cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.progressReportRepository.delete({
      isSubmitted: false,
      tokenExpiresAt: LessThan(new Date()),
    });

    const deletedCount = result.affected || 0;
    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} expired report tokens`);
    }

    return deletedCount;
  }

  // Email template methods
  private generateReportRequestEmailHtml(params: {
    reporterName: string;
    taskTitle: string;
    projectName: string;
    reportUrl: string;
    expiresAt: Date;
  }): string {
    const { reporterName, taskTitle, projectName, reportUrl, expiresAt } = params;
    const expiresAtStr = expiresAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
    .info-box { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>進捗報告リクエスト</h1>
    </div>
    <div class="content">
      <p>${reporterName} 様</p>
      <p>以下のタスクについて、進捗報告をお願いいたします。</p>

      <div class="info-box">
        <p><strong>プロジェクト:</strong> ${projectName}</p>
        <p><strong>タスク:</strong> ${taskTitle}</p>
      </div>

      <p>下記のボタンをクリックして、進捗報告フォームにアクセスしてください。</p>

      <p style="text-align: center;">
        <a href="${reportUrl}" class="button">進捗報告フォームを開く</a>
      </p>

      <p style="color: #ef4444; font-size: 14px;">
        ※ このリンクの有効期限は ${expiresAtStr} までです。
      </p>

      <p>ご不明な点がございましたら、担当者までお問い合わせください。</p>
    </div>
    <div class="footer">
      <p>Partner Hub - パートナー協業プラットフォーム</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private generateReportRequestEmailText(params: {
    reporterName: string;
    taskTitle: string;
    projectName: string;
    reportUrl: string;
    expiresAt: Date;
  }): string {
    const { reporterName, taskTitle, projectName, reportUrl, expiresAt } = params;
    const expiresAtStr = expiresAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    return `
${reporterName} 様

進捗報告リクエスト

以下のタスクについて、進捗報告をお願いいたします。

プロジェクト: ${projectName}
タスク: ${taskTitle}

進捗報告フォームURL:
${reportUrl}

※ このリンクの有効期限は ${expiresAtStr} までです。

ご不明な点がございましたら、担当者までお問い合わせください。

--
Partner Hub - パートナー協業プラットフォーム
    `.trim();
  }

  private generateReportReceivedEmailHtml(params: {
    ownerName: string;
    reporterName: string;
    taskTitle: string;
    projectName: string;
    progress: number;
    comment: string | null;
    taskUrl: string;
  }): string {
    const { ownerName, reporterName, taskTitle, projectName, progress, comment, taskUrl } = params;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
    .info-box { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #10b981; }
    .progress-bar { background: #e5e7eb; border-radius: 9999px; height: 20px; overflow: hidden; margin: 10px 0; }
    .progress-fill { background: #10b981; height: 100%; transition: width 0.3s; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>進捗報告を受信しました</h1>
    </div>
    <div class="content">
      <p>${ownerName} 様</p>
      <p>${reporterName} 様から進捗報告が届きました。</p>

      <div class="info-box">
        <p><strong>プロジェクト:</strong> ${projectName}</p>
        <p><strong>タスク:</strong> ${taskTitle}</p>
        <p><strong>報告者:</strong> ${reporterName}</p>
        <p><strong>進捗:</strong></p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%;"></div>
        </div>
        <p style="text-align: center; font-weight: bold;">${progress}%</p>
        ${comment ? `<p><strong>コメント:</strong><br>${comment}</p>` : ''}
      </div>

      <p style="text-align: center;">
        <a href="${taskUrl}" class="button">タスクを確認する</a>
      </p>
    </div>
    <div class="footer">
      <p>Partner Hub - パートナー協業プラットフォーム</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private generateReportReceivedEmailText(params: {
    ownerName: string;
    reporterName: string;
    taskTitle: string;
    projectName: string;
    progress: number;
    comment: string | null;
    taskUrl: string;
  }): string {
    const { ownerName, reporterName, taskTitle, projectName, progress, comment, taskUrl } = params;

    return `
${ownerName} 様

進捗報告を受信しました

${reporterName} 様から進捗報告が届きました。

プロジェクト: ${projectName}
タスク: ${taskTitle}
報告者: ${reporterName}
進捗: ${progress}%
${comment ? `コメント: ${comment}` : ''}

タスクを確認する:
${taskUrl}

--
Partner Hub - パートナー協業プラットフォーム
    `.trim();
  }
}
