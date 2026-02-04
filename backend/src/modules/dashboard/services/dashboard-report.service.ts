import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { GenerateReportDto, ReportType, ReportFormat, ReportGenerationResult } from '../dto';
import {
  DashboardOverviewService,
  DashboardOverview,
  ProjectSummary,
  PartnerPerformance,
} from './dashboard-overview.service';

@Injectable()
export class DashboardReportService {
  private readonly logger = new Logger(DashboardReportService.name);

  constructor(
    @Inject(forwardRef(() => DashboardOverviewService))
    private overviewService: DashboardOverviewService,
  ) {}

  /**
   * Generate dashboard report
   * Supports weekly, monthly, and custom date range reports
   * Output formats: CSV
   */
  async generateReport(dto: GenerateReportDto): Promise<ReportGenerationResult> {
    this.logger.log(`Generating ${dto.reportType} report in ${dto.format} format`);

    // Calculate date range based on report type
    const { startDate, endDate } = this.calculateDateRange(dto);

    // Gather report data
    const reportData = await this.gatherReportData(startDate, endDate);

    // Generate file based on format
    const { fileName, fileContent, mimeType } = await this.generateReportFile(
      reportData,
      dto.reportType,
      dto.format,
      startDate,
      endDate,
    );

    return {
      success: true,
      fileName,
      fileContent,
      mimeType,
    };
  }

  /**
   * Calculate date range based on report type
   */
  private calculateDateRange(dto: GenerateReportDto): { startDate: Date; endDate: Date } {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let startDate: Date;
    let endDate: Date = today;

    switch (dto.reportType) {
      case ReportType.WEEKLY:
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;

      case ReportType.MONTHLY:
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;

      case ReportType.CUSTOM:
        if (!dto.startDate || !dto.endDate) {
          throw new BusinessException('VALIDATION_001', {
            message: 'Custom report requires start and end dates',
            userMessage: 'カスタムレポートには開始日と終了日が必要です',
          });
        }
        startDate = new Date(dto.startDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(dto.endDate);
        endDate.setHours(23, 59, 59, 999);
        break;

      default:
        throw new BusinessException('VALIDATION_001', {
          message: 'Invalid report type',
          userMessage: '無効なレポートタイプです',
        });
    }

    return { startDate, endDate };
  }

  /**
   * Gather all data needed for the report
   */
  private async gatherReportData(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    overview: DashboardOverview;
    projectSummaries: ProjectSummary[];
    partnerPerformance: PartnerPerformance[];
    taskDistribution: any;
    overdueItems: any;
    periodStart: string;
    periodEnd: string;
  }> {
    const [overview, projectSummaries, partnerPerformance, taskDistribution, overdueItems] =
      await Promise.all([
        this.overviewService.getOverview(),
        this.overviewService.getProjectSummaries(20),
        this.overviewService.getPartnerPerformance(20),
        this.overviewService.getTaskDistribution(),
        this.overviewService.getOverdueItems(),
      ]);

    return {
      overview,
      projectSummaries,
      partnerPerformance,
      taskDistribution,
      overdueItems,
      periodStart: startDate.toISOString().split('T')[0],
      periodEnd: endDate.toISOString().split('T')[0],
    };
  }

  /**
   * Generate report file in CSV format
   */
  private async generateReportFile(
    data: any,
    reportType: ReportType,
    format: ReportFormat,
    startDate: Date,
    endDate: Date,
  ): Promise<{ fileName: string; fileContent: Buffer; mimeType: string }> {
    const reportTypeName =
      reportType === ReportType.WEEKLY
        ? '週次'
        : reportType === ReportType.MONTHLY
          ? '月次'
          : 'カスタム';

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const baseFileName = `ダッシュボード${reportTypeName}レポート_${dateStr}`;

    // CSV形式のみサポート
    return this.generateCsvReport(data, baseFileName);
  }

  /**
   * Generate CSV report
   */
  private generateCsvReport(
    data: any,
    baseFileName: string,
  ): { fileName: string; fileContent: Buffer; mimeType: string } {
    const lines: string[] = [];

    // BOM for Excel compatibility
    const bom = '\uFEFF';

    // Overview section
    lines.push('=== ダッシュボード概要 ===');
    lines.push(`期間,${data.periodStart},${data.periodEnd}`);
    lines.push('');
    lines.push('項目,値');
    lines.push(`総案件数,${data.overview.totalProjects}`);
    lines.push(`進行中案件,${data.overview.activeProjects}`);
    lines.push(`完了案件,${data.overview.completedProjects}`);
    lines.push(`総タスク数,${data.overview.totalTasks}`);
    lines.push(`完了タスク,${data.overview.completedTasks}`);
    lines.push(`未完了タスク,${data.overview.pendingTasks}`);
    lines.push(`期限超過タスク,${data.overview.overdueTasks}`);
    lines.push(`総パートナー数,${data.overview.totalPartners}`);
    lines.push(`アクティブパートナー,${data.overview.activePartners}`);
    lines.push('');

    // Project summaries
    const projectStatusLabels: Record<string, string> = {
      planning: '計画中',
      in_progress: '進行中',
      on_hold: '保留',
      completed: '完了',
      cancelled: 'キャンセル',
    };

    lines.push('=== 案件サマリー ===');
    lines.push('案件名,ステータス,進捗率,終了日,タスク数,完了タスク,期限超過タスク');
    for (const project of data.projectSummaries) {
      lines.push(
        `"${project.name}",${projectStatusLabels[project.status] || project.status},${project.progress}%,${
          project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '-'
        },${project.tasksCount},${project.completedTasksCount},${project.overdueTasksCount}`,
      );
    }
    lines.push('');

    // Partner performance
    lines.push('=== パートナーパフォーマンス ===');
    lines.push('パートナー名,評価,総案件数,完了案件,アクティブタスク,完了タスク');
    for (const partner of data.partnerPerformance) {
      lines.push(
        `"${partner.name}",${partner.rating},${partner.totalProjects},${partner.completedProjects},${partner.activeTasks},${partner.completedTasks}`,
      );
    }
    lines.push('');

    // Task distribution
    const statusLabels: Record<string, string> = {
      todo: '未着手',
      in_progress: '進行中',
      completed: '完了',
      cancelled: 'キャンセル',
    };
    const priorityLabels: Record<string, string> = {
      low: '低',
      medium: '中',
      high: '高',
      urgent: '緊急',
    };

    lines.push('=== タスク分布 ===');
    lines.push('ステータス別:');
    for (const [status, count] of Object.entries(data.taskDistribution.byStatus)) {
      lines.push(`${statusLabels[status] || status},${count}`);
    }
    lines.push('');
    lines.push('優先度別:');
    for (const [priority, count] of Object.entries(data.taskDistribution.byPriority)) {
      lines.push(`${priorityLabels[priority] || priority},${count}`);
    }

    const csvContent = bom + lines.join('\n');

    return {
      fileName: `${baseFileName}.csv`,
      fileContent: Buffer.from(csvContent, 'utf-8'),
      mimeType: 'text/csv; charset=utf-8',
    };
  }
}
