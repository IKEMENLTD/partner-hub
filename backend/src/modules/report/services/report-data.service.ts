import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Project } from '../../project/entities/project.entity';
import { Task } from '../../task/entities/task.entity';
import { Partner } from '../../partner/entities/partner.entity';
import { ProjectStatus } from '../../project/enums/project-status.enum';
import { TaskStatus } from '../../task/enums/task-status.enum';
import { PartnerStatus } from '../../partner/enums/partner-status.enum';
import { ReportPeriod } from '../entities/report-config.entity';
import { ReportData } from '../entities/generated-report.entity';

@Injectable()
export class ReportDataService {
  private readonly logger = new Logger(ReportDataService.name);

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
  ) {}

  async gatherReportData(startDate: Date, endDate: Date): Promise<ReportData> {
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

  async getProjectStats(): Promise<ReportData['projectSummary']> {
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

  async getTaskStats(): Promise<ReportData['taskSummary']> {
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

  async getPartnerPerformance(): Promise<ReportData['partnerPerformance']> {
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
        completedTasks.length > 0 ? Math.round((onTimeCount / completedTasks.length) * 100) : 100;

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

  async getHighlights(startDate: Date, endDate: Date): Promise<ReportData['highlights']> {
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
        (new Date(project.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
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
        (new Date(task.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
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

  async getHealthScoreStats(): Promise<ReportData['healthScoreStats']> {
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

    const totalScore = projects.reduce((sum, p) => sum + (p.healthScore || 100), 0);
    const averageScore = Math.round(totalScore / totalProjects);
    const projectsAtRisk = projects.filter((p) => (p.healthScore || 100) < 60).length;

    return {
      averageScore,
      projectsAtRisk,
      totalProjects,
    };
  }
}
