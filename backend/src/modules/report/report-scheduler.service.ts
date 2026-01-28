import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportService } from './report.service';
import { EmailService } from '../notification/services/email.service';
import {
  ReportConfig,
  ReportPeriod,
  ReportStatus,
} from './entities/report-config.entity';
import {
  GeneratedReport,
  GeneratedReportStatus,
} from './entities/generated-report.entity';

@Injectable()
export class ReportSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ReportSchedulerService.name);

  constructor(
    @InjectRepository(ReportConfig)
    private reportConfigRepository: Repository<ReportConfig>,
    @InjectRepository(GeneratedReport)
    private generatedReportRepository: Repository<GeneratedReport>,
    private reportService: ReportService,
    private emailService: EmailService,
  ) {}

  onModuleInit() {
    this.logger.log('Report Scheduler Service initialized');
  }

  /**
   * Check for scheduled reports every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processScheduledReports(): Promise<void> {
    this.logger.debug('Checking for scheduled reports to generate...');

    try {
      const configsToRun = await this.reportService.getActiveConfigsForScheduling();

      if (configsToRun.length === 0) {
        this.logger.debug('No scheduled reports to generate');
        return;
      }

      this.logger.log(`Found ${configsToRun.length} report(s) to generate`);

      for (const config of configsToRun) {
        try {
          await this.generateAndSendReport(config);
        } catch (error) {
          this.logger.error(
            `Failed to generate report for config ${config.id}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error in scheduled report processing: ${error.message}`);
    }
  }

  /**
   * Generate and send a report based on config
   */
  async generateAndSendReport(config: ReportConfig): Promise<GeneratedReport> {
    this.logger.log(`Generating scheduled report: ${config.name} (${config.id})`);

    // Calculate date range based on period
    const { start, end } = this.calculatePeriodRange(config.period);

    // Generate report data
    const reportData = await this.reportService.gatherReportData(start, end);

    // Determine title
    const periodLabel = config.period === ReportPeriod.MONTHLY ? '月次' : '週次';
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const title = `${periodLabel}レポート (${startStr} - ${endStr})`;

    // Create generated report
    const generatedReport = this.generatedReportRepository.create({
      reportConfigId: config.id,
      title,
      period: config.period,
      dateRangeStart: start,
      dateRangeEnd: end,
      status: GeneratedReportStatus.GENERATED,
      reportData,
      isManual: false,
    });

    await this.generatedReportRepository.save(generatedReport);

    // Send email to recipients
    if (config.recipients && config.recipients.length > 0) {
      try {
        await this.sendReportEmail(config, generatedReport);
        generatedReport.status = GeneratedReportStatus.SENT;
        generatedReport.sentTo = config.recipients;
        generatedReport.sentAt = new Date();
        this.logger.log(
          `Report email sent to ${config.recipients.length} recipient(s)`,
        );
      } catch (error) {
        generatedReport.status = GeneratedReportStatus.FAILED;
        generatedReport.errorMessage = error.message;
        this.logger.error(`Failed to send report email: ${error.message}`);
      }

      await this.generatedReportRepository.save(generatedReport);
    }

    // Update config with last run time and next run time
    await this.reportService.markConfigAsRun(config.id);

    this.logger.log(`Scheduled report completed: ${title} (${generatedReport.id})`);

    return generatedReport;
  }

  /**
   * Send report via email
   */
  private async sendReportEmail(
    config: ReportConfig,
    report: GeneratedReport,
  ): Promise<void> {
    const { reportData } = report;
    const html = this.generateReportEmailHtml(config, report);
    const text = this.generateReportEmailText(config, report);

    await this.emailService.sendEmail({
      to: config.recipients,
      subject: `【Partner Hub】${report.title}`,
      html,
      text,
    });
  }

  /**
   * Generate HTML email content
   */
  private generateReportEmailHtml(
    config: ReportConfig,
    report: GeneratedReport,
  ): string {
    const { reportData } = report;
    const periodLabel =
      report.period === ReportPeriod.MONTHLY ? '月次' : '週次';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px; }
    .section { margin-bottom: 30px; }
    .section-title { color: #667eea; font-size: 18px; font-weight: bold; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
    .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #667eea; }
    .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0; }
    th { background: #f8f9fa; font-weight: 600; }
    .highlight { background: #fff3cd; padding: 10px; border-radius: 5px; margin: 5px 0; }
    .issue { background: #f8d7da; padding: 10px; border-radius: 5px; margin: 5px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${periodLabel}サマリーレポート</h1>
    <p>${reportData.dateRange.start} 〜 ${reportData.dateRange.end}</p>
  </div>

  <div class="content">
    <div class="section">
      <div class="section-title">案件サマリー</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${reportData.projectSummary.total}</div>
          <div class="stat-label">総案件数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${reportData.projectSummary.active}</div>
          <div class="stat-label">進行中</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${reportData.projectSummary.completed}</div>
          <div class="stat-label">完了</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: ${reportData.projectSummary.delayed > 0 ? '#dc3545' : '#28a745'}">${reportData.projectSummary.delayed}</div>
          <div class="stat-label">遅延</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">タスクサマリー</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${reportData.taskSummary.total}</div>
          <div class="stat-label">総タスク数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${reportData.taskSummary.completed}</div>
          <div class="stat-label">完了</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${reportData.taskSummary.inProgress}</div>
          <div class="stat-label">進行中</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: ${reportData.taskSummary.overdue > 0 ? '#dc3545' : '#28a745'}">${reportData.taskSummary.overdue}</div>
          <div class="stat-label">期限超過</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${reportData.taskSummary.completionRate}%</div>
          <div class="stat-label">完了率</div>
        </div>
      </div>
    </div>

    ${
      reportData.partnerPerformance.length > 0
        ? `
    <div class="section">
      <div class="section-title">パートナーパフォーマンス</div>
      <table>
        <thead>
          <tr>
            <th>パートナー名</th>
            <th>進行中案件</th>
            <th>完了タスク</th>
            <th>納期遵守率</th>
            <th>評価</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.partnerPerformance
            .map(
              (p) => `
            <tr>
              <td>${p.partnerName}</td>
              <td>${p.activeProjects}</td>
              <td>${p.tasksCompleted}/${p.tasksTotal}</td>
              <td>${p.onTimeDeliveryRate}%</td>
              <td>${p.rating.toFixed(1)}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    <div class="section">
      <div class="section-title">ハイライト</div>
      ${
        reportData.highlights.keyAchievements.length > 0
          ? `
        <h4>主な成果</h4>
        ${reportData.highlights.keyAchievements.map((a) => `<div class="highlight">✓ ${a}</div>`).join('')}
      `
          : ''
      }
      ${
        reportData.highlights.issues.length > 0
          ? `
        <h4>注意事項</h4>
        ${reportData.highlights.issues.map((i) => `<div class="issue">⚠ ${i}</div>`).join('')}
      `
          : ''
      }
      ${
        reportData.highlights.upcomingDeadlines.length > 0
          ? `
        <h4>今後の期限</h4>
        <table>
          <thead>
            <tr>
              <th>種類</th>
              <th>名前</th>
              <th>期限</th>
              <th>残日数</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.highlights.upcomingDeadlines
              .map(
                (d) => `
              <tr>
                <td>${d.type === 'project' ? '案件' : 'タスク'}</td>
                <td>${d.name}</td>
                <td>${d.dueDate}</td>
                <td>${d.daysRemaining}日</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      `
          : ''
      }
    </div>

    <div class="footer">
      <p>このレポートは Partner Hub から自動送信されました。</p>
      <p>レポート設定は「設定」メニューから変更できます。</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text email content
   */
  private generateReportEmailText(
    config: ReportConfig,
    report: GeneratedReport,
  ): string {
    const { reportData } = report;
    const periodLabel =
      report.period === ReportPeriod.MONTHLY ? '月次' : '週次';

    let text = `
${periodLabel}サマリーレポート
期間: ${reportData.dateRange.start} 〜 ${reportData.dateRange.end}

========================================
案件サマリー
========================================
総案件数: ${reportData.projectSummary.total}
進行中: ${reportData.projectSummary.active}
完了: ${reportData.projectSummary.completed}
遅延: ${reportData.projectSummary.delayed}

========================================
タスクサマリー
========================================
総タスク数: ${reportData.taskSummary.total}
完了: ${reportData.taskSummary.completed}
進行中: ${reportData.taskSummary.inProgress}
期限超過: ${reportData.taskSummary.overdue}
完了率: ${reportData.taskSummary.completionRate}%
`;

    if (reportData.partnerPerformance.length > 0) {
      text += `
========================================
パートナーパフォーマンス
========================================
`;
      for (const p of reportData.partnerPerformance) {
        text += `
${p.partnerName}
  進行中案件: ${p.activeProjects}
  完了タスク: ${p.tasksCompleted}/${p.tasksTotal}
  納期遵守率: ${p.onTimeDeliveryRate}%
  評価: ${p.rating.toFixed(1)}
`;
      }
    }

    text += `
========================================
ハイライト
========================================
`;

    if (reportData.highlights.keyAchievements.length > 0) {
      text += `\n【主な成果】\n`;
      for (const a of reportData.highlights.keyAchievements) {
        text += `  ✓ ${a}\n`;
      }
    }

    if (reportData.highlights.issues.length > 0) {
      text += `\n【注意事項】\n`;
      for (const i of reportData.highlights.issues) {
        text += `  ⚠ ${i}\n`;
      }
    }

    if (reportData.highlights.upcomingDeadlines.length > 0) {
      text += `\n【今後の期限】\n`;
      for (const d of reportData.highlights.upcomingDeadlines) {
        text += `  - ${d.type === 'project' ? '案件' : 'タスク'}: ${d.name} (${d.dueDate}, 残${d.daysRemaining}日)\n`;
      }
    }

    text += `
----------------------------------------
このレポートは Partner Hub から自動送信されました。
レポート設定は「設定」メニューから変更できます。
`;

    return text;
  }

  /**
   * Calculate period date range
   */
  private calculatePeriodRange(period: ReportPeriod): {
    start: Date;
    end: Date;
  } {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);

    if (period === ReportPeriod.MONTHLY) {
      start.setMonth(start.getMonth() - 1);
    } else {
      start.setDate(start.getDate() - 7);
    }

    start.setHours(0, 0, 0, 0);

    return { start, end };
  }
}
