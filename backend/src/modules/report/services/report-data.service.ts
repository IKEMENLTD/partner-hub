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

  async gatherReportData(startDate: Date, endDate: Date, organizationId?: string): Promise<ReportData> {
    // Project summary
    const projectStats = await this.getProjectStats(organizationId);

    // Task summary
    const taskStats = await this.getTaskStats(organizationId);

    // Partner performance
    const partnerPerformance = await this.getPartnerPerformance(organizationId);

    // Highlights
    const highlights = await this.getHighlights(startDate, endDate, organizationId);

    // Health score stats
    const healthScoreStats = await this.getHealthScoreStats(organizationId);

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

  async getProjectStats(organizationId?: string): Promise<ReportData['projectSummary']> {
    const orgWhere = organizationId ? { organizationId } : {};

    const [total, active, completed] = await Promise.all([
      this.projectRepository.count({ where: orgWhere }),
      this.projectRepository.count({
        where: { ...orgWhere, status: ProjectStatus.IN_PROGRESS },
      }),
      this.projectRepository.count({
        where: { ...orgWhere, status: ProjectStatus.COMPLETED },
      }),
    ]);

    // Calculate delayed projects
    const today = new Date();
    const delayedQb = this.projectRepository
      .createQueryBuilder('project')
      .where('project.endDate < :today', { today })
      .andWhere('project.status NOT IN (:...completedStatuses)', {
        completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      });
    if (organizationId) {
      delayedQb.andWhere('project.organizationId = :organizationId', { organizationId });
    }
    const delayed = await delayedQb.getCount();

    // Get by status breakdown
    const statusQb = this.projectRepository
      .createQueryBuilder('project')
      .select('project.status', 'status')
      .addSelect('COUNT(*)', 'count');
    if (organizationId) {
      statusQb.where('project.organizationId = :organizationId', { organizationId });
    }
    const statusCounts = await statusQb
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

  async getTaskStats(organizationId?: string): Promise<ReportData['taskSummary']> {
    const today = new Date();

    // Helper to add org filter to task query builders (tasks join through project)
    const addTaskOrgFilter = (qb: any, alias: string = 'task') => {
      if (organizationId) {
        qb.innerJoin(`${alias}.project`, 'taskProject')
          .andWhere('taskProject.organizationId = :organizationId', { organizationId });
      }
      return qb;
    };

    const totalQb = this.taskRepository.createQueryBuilder('task');
    addTaskOrgFilter(totalQb);
    const total = await totalQb.getCount();

    const completedQb = this.taskRepository.createQueryBuilder('task')
      .where('task.status = :status', { status: TaskStatus.COMPLETED });
    addTaskOrgFilter(completedQb);
    const completed = await completedQb.getCount();

    const inProgressQb = this.taskRepository.createQueryBuilder('task')
      .where('task.status = :status', { status: TaskStatus.IN_PROGRESS });
    addTaskOrgFilter(inProgressQb);
    const inProgress = await inProgressQb.getCount();

    const overdueQb = this.taskRepository
      .createQueryBuilder('task')
      .where('task.dueDate < :today', { today })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      });
    addTaskOrgFilter(overdueQb);
    const overdue = await overdueQb.getCount();

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Get by priority breakdown
    const priorityQb = this.taskRepository
      .createQueryBuilder('task')
      .select('task.priority', 'priority')
      .addSelect('COUNT(*)', 'count');
    if (organizationId) {
      priorityQb.innerJoin('task.project', 'taskProject')
        .where('taskProject.organizationId = :organizationId', { organizationId });
    }
    const priorityCounts = await priorityQb
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

  async getPartnerPerformance(organizationId?: string): Promise<ReportData['partnerPerformance']> {
    const partnerWhere: Record<string, any> = { status: PartnerStatus.ACTIVE };
    if (organizationId) {
      partnerWhere.organizationId = organizationId;
    }

    const partners = await this.partnerRepository.find({
      where: partnerWhere,
      order: { rating: 'DESC' },
      take: 10,
    });

    if (partners.length === 0) {
      return [];
    }

    const partnerIds = partners.map((p) => p.id);

    // Batch query: Get active project counts for all partners in one query
    const activeProjectCounts = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project.partners', 'partner')
      .select('partner.id', 'partnerId')
      .addSelect('COUNT(project.id)', 'count')
      .where('partner.id IN (:...partnerIds)', { partnerIds })
      .andWhere('project.status = :status', { status: ProjectStatus.IN_PROGRESS })
      .groupBy('partner.id')
      .getRawMany();

    const activeProjectMap = new Map<string, number>();
    activeProjectCounts.forEach((item) => {
      activeProjectMap.set(item.partnerId, parseInt(item.count, 10));
    });

    // Batch query: Get task stats for all partners in one query
    const taskStats = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.partnerId', 'partnerId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN task.status = '${TaskStatus.COMPLETED}' THEN 1 ELSE 0 END)`,
        'completed',
      )
      .where('task.partnerId IN (:...partnerIds)', { partnerIds })
      .groupBy('task.partnerId')
      .getRawMany();

    const taskStatsMap = new Map<string, { total: number; completed: number }>();
    taskStats.forEach((item) => {
      taskStatsMap.set(item.partnerId, {
        total: parseInt(item.total, 10),
        completed: parseInt(item.completed, 10),
      });
    });

    // Batch query: Get all completed tasks for all partners to calculate on-time rate
    const completedTasks = await this.taskRepository.find({
      where: { partnerId: In(partnerIds), status: TaskStatus.COMPLETED },
      select: ['id', 'partnerId', 'dueDate', 'completedAt'],
    });

    // Group completed tasks by partner and calculate on-time rate
    const onTimeRateMap = new Map<string, number>();
    const tasksByPartner = new Map<string, typeof completedTasks>();

    completedTasks.forEach((task) => {
      if (!tasksByPartner.has(task.partnerId)) {
        tasksByPartner.set(task.partnerId, []);
      }
      tasksByPartner.get(task.partnerId)!.push(task);
    });

    tasksByPartner.forEach((tasks, partnerId) => {
      let onTimeCount = 0;
      for (const task of tasks) {
        if (task.dueDate && task.completedAt) {
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(23, 59, 59, 999);
          if (new Date(task.completedAt) <= dueDate) {
            onTimeCount++;
          }
        }
      }
      onTimeRateMap.set(
        partnerId,
        tasks.length > 0 ? Math.round((onTimeCount / tasks.length) * 100) : 100,
      );
    });

    // Build results using pre-fetched data
    const performances: ReportData['partnerPerformance'] = partners.map((partner) => {
      const stats = taskStatsMap.get(partner.id) || { total: 0, completed: 0 };
      return {
        partnerId: partner.id,
        partnerName: partner.name,
        activeProjects: activeProjectMap.get(partner.id) || 0,
        tasksCompleted: stats.completed,
        tasksTotal: stats.total,
        onTimeDeliveryRate: onTimeRateMap.get(partner.id) || 100,
        rating: Number(partner.rating),
      };
    });

    return performances;
  }

  async getHighlights(startDate: Date, endDate: Date, organizationId?: string): Promise<ReportData['highlights']> {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // Key achievements - recently completed projects and tasks
    const keyAchievements: string[] = [];

    const recentProjectsQb = this.projectRepository
      .createQueryBuilder('project')
      .where('project.status = :status', { status: ProjectStatus.COMPLETED })
      .andWhere('project.updatedAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      });
    if (organizationId) {
      recentProjectsQb.andWhere('project.organizationId = :organizationId', { organizationId });
    }
    const recentlyCompletedProjects = await recentProjectsQb.take(5).getMany();

    for (const project of recentlyCompletedProjects) {
      keyAchievements.push(`案件「${project.name}」が完了しました`);
    }

    // Count completed tasks in period
    const completedTasksQb = this.taskRepository
      .createQueryBuilder('task')
      .where('task.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere('task.completedAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      });
    if (organizationId) {
      completedTasksQb.innerJoin('task.project', 'ctProject')
        .andWhere('ctProject.organizationId = :organizationId', { organizationId });
    }
    const completedTasksCount = await completedTasksQb.getCount();

    if (completedTasksCount > 0) {
      keyAchievements.push(`期間中に${completedTasksCount}件のタスクが完了しました`);
    }

    // Issues - overdue tasks and at-risk projects
    const issues: string[] = [];

    const overdueQb = this.taskRepository
      .createQueryBuilder('task')
      .where('task.dueDate < :today', { today })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      });
    if (organizationId) {
      overdueQb.innerJoin('task.project', 'odProject')
        .andWhere('odProject.organizationId = :organizationId', { organizationId });
    }
    const overdueTaskCount = await overdueQb.getCount();

    if (overdueTaskCount > 0) {
      issues.push(`${overdueTaskCount}件のタスクが期限超過しています`);
    }

    const atRiskQb = this.projectRepository
      .createQueryBuilder('project')
      .where('project.status = :status', { status: ProjectStatus.IN_PROGRESS })
      .andWhere('project.progress < 50')
      .andWhere('project.endDate < :futureDate', {
        futureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    if (organizationId) {
      atRiskQb.andWhere('project.organizationId = :organizationId', { organizationId });
    }
    const atRiskProjects = await atRiskQb.getCount();

    if (atRiskProjects > 0) {
      issues.push(`${atRiskProjects}件の案件がリスク状態にあります`);
    }

    // Upcoming deadlines
    const upcomingDeadlines: ReportData['highlights']['upcomingDeadlines'] = [];

    const upcomingProjectQb = this.projectRepository
      .createQueryBuilder('project')
      .where('project.endDate BETWEEN :today AND :nextWeek', {
        today,
        nextWeek,
      })
      .andWhere('project.status NOT IN (:...completedStatuses)', {
        completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      });
    if (organizationId) {
      upcomingProjectQb.andWhere('project.organizationId = :organizationId', { organizationId });
    }
    const upcomingProjectDeadlines = await upcomingProjectQb
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
        dueDate: new Date(project.endDate).toISOString().split('T')[0],
        daysRemaining,
      });
    }

    const upcomingTaskQb = this.taskRepository
      .createQueryBuilder('task')
      .where('task.dueDate BETWEEN :today AND :nextWeek', { today, nextWeek })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      });
    if (organizationId) {
      upcomingTaskQb.innerJoin('task.project', 'utProject')
        .andWhere('utProject.organizationId = :organizationId', { organizationId });
    }
    const upcomingTaskDeadlines = await upcomingTaskQb
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
        dueDate: new Date(task.dueDate).toISOString().split('T')[0],
        daysRemaining,
      });
    }

    return {
      keyAchievements,
      issues,
      upcomingDeadlines,
    };
  }

  async getHealthScoreStats(organizationId?: string): Promise<ReportData['healthScoreStats']> {
    const whereCondition: any = {
      status: Not(In([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED])),
    };
    if (organizationId) {
      whereCondition.organizationId = organizationId;
    }

    const projects = await this.projectRepository.find({
      where: whereCondition,
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
