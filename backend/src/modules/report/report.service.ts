import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, LessThan } from 'typeorm';
import { Project } from '../project/entities/project.entity';
import { Task } from '../task/entities/task.entity';
import { Partner } from '../partner/entities/partner.entity';
import { ProjectStatus } from '../project/enums/project-status.enum';
import { TaskStatus } from '../task/enums/task-status.enum';
import { PartnerStatus } from '../partner/enums/partner-status.enum';
import {
  ReportConfig,
  ReportPeriod,
  ReportStatus,
} from './entities/report-config.entity';
import {
  GeneratedReport,
  GeneratedReportStatus,
  ReportData,
} from './entities/generated-report.entity';
import {
  CreateReportConfigDto,
  UpdateReportConfigDto,
  QueryReportConfigDto,
  QueryGeneratedReportDto,
  GenerateReportDto,
} from './dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(ReportConfig)
    private reportConfigRepository: Repository<ReportConfig>,
    @InjectRepository(GeneratedReport)
    private generatedReportRepository: Repository<GeneratedReport>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
  ) {}

  // ==================== Report Config CRUD ====================

  async createConfig(
    dto: CreateReportConfigDto,
    createdById: string,
  ): Promise<ReportConfig> {
    const config = this.reportConfigRepository.create({
      ...dto,
      createdById,
      scheduleCron: this.buildCronExpression(dto),
      nextRunAt: this.calculateNextRunTime(dto),
    });

    await this.reportConfigRepository.save(config);
    this.logger.log(`Report config created: ${config.name} (${config.id})`);

    return this.findConfigById(config.id);
  }

  async findAllConfigs(
    queryDto: QueryReportConfigDto,
  ): Promise<PaginatedResponseDto<ReportConfig>> {
    const {
      page = 1,
      limit = 10,
      period,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.reportConfigRepository
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.createdBy', 'createdBy');

    if (period) {
      queryBuilder.andWhere('config.period = :period', { period });
    }

    if (status) {
      queryBuilder.andWhere('config.status = :status', { status });
    } else {
      // By default, exclude deleted configs
      queryBuilder.andWhere('config.status != :deletedStatus', {
        deletedStatus: ReportStatus.DELETED,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(config.name ILIKE :search OR config.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(`config.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findConfigById(id: string): Promise<ReportConfig> {
    const config = await this.reportConfigRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!config) {
      throw new NotFoundException(`Report config with ID "${id}" not found`);
    }

    return config;
  }

  async updateConfig(
    id: string,
    dto: UpdateReportConfigDto,
  ): Promise<ReportConfig> {
    const config = await this.findConfigById(id);

    Object.assign(config, dto);

    // Recalculate cron and next run time if schedule changed
    if (dto.period || dto.dayOfWeek || dto.dayOfMonth || dto.sendTime) {
      config.scheduleCron = this.buildCronExpression(config);
      config.nextRunAt = this.calculateNextRunTime(config);
    }

    await this.reportConfigRepository.save(config);
    this.logger.log(`Report config updated: ${config.name} (${config.id})`);

    return this.findConfigById(id);
  }

  async deleteConfig(id: string): Promise<void> {
    const config = await this.findConfigById(id);
    config.status = ReportStatus.DELETED;
    await this.reportConfigRepository.save(config);
    this.logger.log(`Report config deleted: ${config.name} (${id})`);
  }

  // ==================== Generated Reports ====================

  async findAllGeneratedReports(
    queryDto: QueryGeneratedReportDto,
  ): Promise<PaginatedResponseDto<GeneratedReport>> {
    const {
      page = 1,
      limit = 10,
      reportConfigId,
      period,
      status,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.generatedReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reportConfig', 'reportConfig')
      .leftJoinAndSelect('report.generatedBy', 'generatedBy');

    if (reportConfigId) {
      queryBuilder.andWhere('report.reportConfigId = :reportConfigId', {
        reportConfigId,
      });
    }

    if (period) {
      queryBuilder.andWhere('report.period = :period', { period });
    }

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    if (fromDate) {
      queryBuilder.andWhere('report.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere('report.createdAt <= :toDate', { toDate });
    }

    queryBuilder.orderBy(`report.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findGeneratedReportById(id: string): Promise<GeneratedReport> {
    const report = await this.generatedReportRepository.findOne({
      where: { id },
      relations: ['reportConfig', 'generatedBy'],
    });

    if (!report) {
      throw new NotFoundException(`Generated report with ID "${id}" not found`);
    }

    return report;
  }

  // ==================== Report Generation ====================

  async generateReport(
    dto: GenerateReportDto,
    generatedById?: string,
  ): Promise<GeneratedReport> {
    const { period, startDate, endDate, reportConfigId } = dto;

    // Calculate date range
    const { start, end } = this.calculateDateRange(
      period || ReportPeriod.WEEKLY,
      startDate,
      endDate,
    );

    // Generate report data
    const reportData = await this.gatherReportData(start, end);

    // Determine title
    const periodLabel = period === ReportPeriod.MONTHLY ? '月次' : '週次';
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const title = `${periodLabel}レポート (${startStr} - ${endStr})`;

    // Create generated report
    const generatedReport = this.generatedReportRepository.create({
      reportConfigId,
      title,
      period: period || ReportPeriod.WEEKLY,
      dateRangeStart: start,
      dateRangeEnd: end,
      status: GeneratedReportStatus.GENERATED,
      reportData,
      isManual: true,
      generatedById,
    });

    await this.generatedReportRepository.save(generatedReport);
    this.logger.log(`Report generated: ${title} (${generatedReport.id})`);

    return this.findGeneratedReportById(generatedReport.id);
  }

  async gatherReportData(startDate: Date, endDate: Date): Promise<ReportData> {
    const today = new Date();

    // Project summary
    const projectStats = await this.getProjectStats();

    // Task summary
    const taskStats = await this.getTaskStats();

    // Partner performance
    const partnerPerformance = await this.getPartnerPerformance();

    // Highlights
    const highlights = await this.getHighlights(startDate, endDate);

    // Health score stats
    const healthScoreStats = await this.getHealthScoreStats();

    return {
      period: ReportPeriod.WEEKLY,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      projectSummary: projectStats,
      taskSummary: taskStats,
      partnerPerformance,
      highlights,
      healthScoreStats,
    };
  }

  private async getProjectStats(): Promise<ReportData['projectSummary']> {
    const [total, active, completed] = await Promise.all([
      this.projectRepository.count(),
      this.projectRepository.count({
        where: { status: ProjectStatus.IN_PROGRESS },
      }),
      this.projectRepository.count({
        where: { status: ProjectStatus.COMPLETED },
      }),
    ]);

    // Calculate delayed projects
    const today = new Date();
    const delayed = await this.projectRepository
      .createQueryBuilder('project')
      .where('project.endDate < :today', { today })
      .andWhere('project.status NOT IN (:...completedStatuses)', {
        completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      })
      .getCount();

    // Get by status breakdown
    const statusCounts = await this.projectRepository
      .createQueryBuilder('project')
      .select('project.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('project.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((item) => {
      byStatus[item.status] = parseInt(item.count, 10);
    });

    return {
      total,
      active,
      completed,
      delayed,
      byStatus,
    };
  }

  private async getTaskStats(): Promise<ReportData['taskSummary']> {
    const today = new Date();

    const [total, completed, inProgress] = await Promise.all([
      this.taskRepository.count(),
      this.taskRepository.count({ where: { status: TaskStatus.COMPLETED } }),
      this.taskRepository.count({ where: { status: TaskStatus.IN_PROGRESS } }),
    ]);

    const overdue = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.dueDate < :today', { today })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .getCount();

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Get by priority breakdown
    const priorityCounts = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.priority')
      .getRawMany();

    const byPriority: Record<string, number> = {};
    priorityCounts.forEach((item) => {
      byPriority[item.priority] = parseInt(item.count, 10);
    });

    return {
      total,
      completed,
      inProgress,
      overdue,
      completionRate,
      byPriority,
    };
  }

  private async getPartnerPerformance(): Promise<
    ReportData['partnerPerformance']
  > {
    const partners = await this.partnerRepository.find({
      where: { status: PartnerStatus.ACTIVE },
      order: { rating: 'DESC' },
      take: 10,
    });

    const performances: ReportData['partnerPerformance'] = [];

    for (const partner of partners) {
      // Get active projects for this partner
      const activeProjects = await this.projectRepository
        .createQueryBuilder('project')
        .leftJoin('project.partners', 'partner')
        .where('partner.id = :partnerId', { partnerId: partner.id })
        .andWhere('project.status = :status', {
          status: ProjectStatus.IN_PROGRESS,
        })
        .getCount();

      // Get task stats
      const [tasksTotal, tasksCompleted] = await Promise.all([
        this.taskRepository.count({ where: { partnerId: partner.id } }),
        this.taskRepository.count({
          where: { partnerId: partner.id, status: TaskStatus.COMPLETED },
        }),
      ]);

      // Calculate on-time delivery rate
      const completedTasks = await this.taskRepository.find({
        where: { partnerId: partner.id, status: TaskStatus.COMPLETED },
        select: ['id', 'dueDate', 'completedAt'],
      });

      let onTimeCount = 0;
      for (const task of completedTasks) {
        if (task.dueDate && task.completedAt) {
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(23, 59, 59, 999);
          if (new Date(task.completedAt) <= dueDate) {
            onTimeCount++;
          }
        }
      }
      const onTimeDeliveryRate =
        completedTasks.length > 0
          ? Math.round((onTimeCount / completedTasks.length) * 100)
          : 100;

      performances.push({
        partnerId: partner.id,
        partnerName: partner.name,
        activeProjects,
        tasksCompleted,
        tasksTotal,
        onTimeDeliveryRate,
        rating: Number(partner.rating),
      });
    }

    return performances;
  }

  private async getHighlights(
    startDate: Date,
    endDate: Date,
  ): Promise<ReportData['highlights']> {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // Key achievements - recently completed projects and tasks
    const keyAchievements: string[] = [];

    const recentlyCompletedProjects = await this.projectRepository
      .createQueryBuilder('project')
      .where('project.status = :status', { status: ProjectStatus.COMPLETED })
      .andWhere('project.updatedAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .take(5)
      .getMany();

    for (const project of recentlyCompletedProjects) {
      keyAchievements.push(`案件「${project.name}」が完了しました`);
    }

    // Count completed tasks in period
    const completedTasksCount = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere('task.completedAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getCount();

    if (completedTasksCount > 0) {
      keyAchievements.push(`期間中に${completedTasksCount}件のタスクが完了しました`);
    }

    // Issues - overdue tasks and at-risk projects
    const issues: string[] = [];

    const overdueTaskCount = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.dueDate < :today', { today })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .getCount();

    if (overdueTaskCount > 0) {
      issues.push(`${overdueTaskCount}件のタスクが期限超過しています`);
    }

    const atRiskProjects = await this.projectRepository
      .createQueryBuilder('project')
      .where('project.status = :status', { status: ProjectStatus.IN_PROGRESS })
      .andWhere('project.progress < 50')
      .andWhere('project.endDate < :futureDate', {
        futureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .getCount();

    if (atRiskProjects > 0) {
      issues.push(`${atRiskProjects}件の案件がリスク状態にあります`);
    }

    // Upcoming deadlines
    const upcomingDeadlines: ReportData['highlights']['upcomingDeadlines'] = [];

    const upcomingProjectDeadlines = await this.projectRepository
      .createQueryBuilder('project')
      .where('project.endDate BETWEEN :today AND :nextWeek', {
        today,
        nextWeek,
      })
      .andWhere('project.status NOT IN (:...completedStatuses)', {
        completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      })
      .orderBy('project.endDate', 'ASC')
      .take(5)
      .getMany();

    for (const project of upcomingProjectDeadlines) {
      const daysRemaining = Math.ceil(
        (new Date(project.endDate).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      upcomingDeadlines.push({
        type: 'project',
        id: project.id,
        name: project.name,
        dueDate: project.endDate.toISOString().split('T')[0],
        daysRemaining,
      });
    }

    const upcomingTaskDeadlines = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.dueDate BETWEEN :today AND :nextWeek', { today, nextWeek })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .orderBy('task.dueDate', 'ASC')
      .take(5)
      .getMany();

    for (const task of upcomingTaskDeadlines) {
      const daysRemaining = Math.ceil(
        (new Date(task.dueDate).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      upcomingDeadlines.push({
        type: 'task',
        id: task.id,
        name: task.title,
        dueDate: task.dueDate.toISOString().split('T')[0],
        daysRemaining,
      });
    }

    return {
      keyAchievements,
      issues,
      upcomingDeadlines,
    };
  }

  private async getHealthScoreStats(): Promise<
    ReportData['healthScoreStats']
  > {
    const projects = await this.projectRepository.find({
      where: {
        status: Not(In([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED])),
      },
      select: ['id', 'healthScore'],
    });

    const totalProjects = projects.length;
    if (totalProjects === 0) {
      return {
        averageScore: 0,
        projectsAtRisk: 0,
        totalProjects: 0,
      };
    }

    const totalScore = projects.reduce(
      (sum, p) => sum + (p.healthScore || 100),
      0,
    );
    const averageScore = Math.round(totalScore / totalProjects);
    const projectsAtRisk = projects.filter(
      (p) => (p.healthScore || 100) < 60,
    ).length;

    return {
      averageScore,
      projectsAtRisk,
      totalProjects,
    };
  }

  // ==================== Helper Methods ====================

  private buildCronExpression(config: Partial<ReportConfig>): string {
    const [hour, minute] = (config.sendTime || '09:00').split(':').map(Number);

    if (config.period === ReportPeriod.MONTHLY) {
      // Monthly: run on specific day of month
      return `${minute} ${hour} ${config.dayOfMonth || 1} * *`;
    } else {
      // Weekly: run on specific day of week
      return `${minute} ${hour} * * ${config.dayOfWeek || 1}`;
    }
  }

  private calculateNextRunTime(config: Partial<ReportConfig>): Date {
    const now = new Date();
    const [hour, minute] = (config.sendTime || '09:00').split(':').map(Number);

    const nextRun = new Date(now);
    nextRun.setHours(hour, minute, 0, 0);

    if (config.period === ReportPeriod.MONTHLY) {
      // Monthly
      nextRun.setDate(config.dayOfMonth || 1);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    } else {
      // Weekly
      const targetDay = config.dayOfWeek || 1;
      const currentDay = now.getDay();
      let daysToAdd = targetDay - currentDay;

      if (daysToAdd < 0 || (daysToAdd === 0 && nextRun <= now)) {
        daysToAdd += 7;
      }

      nextRun.setDate(now.getDate() + daysToAdd);
    }

    return nextRun;
  }

  private calculateDateRange(
    period: ReportPeriod,
    startDateStr?: string,
    endDateStr?: string,
  ): { start: Date; end: Date } {
    if (startDateStr && endDateStr) {
      return {
        start: new Date(startDateStr),
        end: new Date(endDateStr),
      };
    }

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

  // Get active configs that need to run
  async getActiveConfigsForScheduling(): Promise<ReportConfig[]> {
    const now = new Date();

    return this.reportConfigRepository.find({
      where: {
        status: ReportStatus.ACTIVE,
        nextRunAt: LessThan(now),
      },
    });
  }

  // Update config after running
  async markConfigAsRun(configId: string): Promise<void> {
    const config = await this.findConfigById(configId);
    config.lastGeneratedAt = new Date();
    config.nextRunAt = this.calculateNextRunTime(config);
    await this.reportConfigRepository.save(config);
  }
}
