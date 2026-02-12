import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, IsNull } from 'typeorm';
import { Project } from '../project/entities/project.entity';
import { Task } from '../task/entities/task.entity';
import { Partner } from '../partner/entities/partner.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { Reminder } from '../reminder/entities/reminder.entity';
import { ProjectStatus } from '../project/enums/project-status.enum';
import { TaskStatus } from '../task/enums/task-status.enum';
import { PartnerStatus } from '../partner/enums/partner-status.enum';
import { GenerateReportDto, ReportGenerationResult } from './dto';
import {
  DashboardOverviewService,
  DashboardOverview,
  ProjectSummary,
  PartnerPerformance,
} from './services/dashboard-overview.service';
import { DashboardActivityService, ActivityItem } from './services/dashboard-activity.service';
import { DashboardReportService } from './services/dashboard-report.service';

// Re-export interfaces for backward compatibility
export { DashboardOverview, ProjectSummary, PartnerPerformance, ActivityItem };

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(UserProfile)
    private userRepository: Repository<UserProfile>,
    @InjectRepository(Reminder)
    private reminderRepository: Repository<Reminder>,
    @Inject(forwardRef(() => DashboardOverviewService))
    private overviewService: DashboardOverviewService,
    @Inject(forwardRef(() => DashboardActivityService))
    private activityService: DashboardActivityService,
    @Inject(forwardRef(() => DashboardReportService))
    private reportService: DashboardReportService,
  ) {}

  // Delegate to overview service
  async getOverview(userId?: string): Promise<DashboardOverview> {
    return this.overviewService.getOverview(userId);
  }

  async getProjectSummaries(limit: number = 10, organizationId?: string): Promise<ProjectSummary[]> {
    return this.overviewService.getProjectSummaries(limit, organizationId);
  }

  async getPartnerPerformance(limit: number = 10, organizationId?: string): Promise<PartnerPerformance[]> {
    return this.overviewService.getPartnerPerformance(limit, organizationId);
  }

  async getUpcomingDeadlines(days: number = 7, organizationId?: string): Promise<{
    projects: Project[];
    tasks: Task[];
  }> {
    return this.overviewService.getUpcomingDeadlines(days, organizationId);
  }

  async getOverdueItems(organizationId?: string): Promise<{
    projects: Project[];
    tasks: Task[];
  }> {
    return this.overviewService.getOverdueItems(organizationId);
  }

  async getTaskDistribution(organizationId?: string): Promise<{
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
  }> {
    return this.overviewService.getTaskDistribution(organizationId);
  }

  async getProjectProgress(organizationId?: string): Promise<{
    byStatus: Record<string, number>;
    averageProgress: number;
    onTrack: number;
    atRisk: number;
    delayed: number;
    healthScoreStats: any;
  }> {
    return this.overviewService.getProjectProgress(organizationId);
  }

  async getHealthScoreStatistics() {
    return this.overviewService.getHealthScoreStatistics();
  }

  async getAllProjectsHealthScores() {
    return this.overviewService.getAllProjectsHealthScores();
  }

  // Delegate to activity service
  async getRecentActivity(limit: number = 20, organizationId?: string): Promise<ActivityItem[]> {
    return this.activityService.getRecentActivity(limit, organizationId);
  }

  async getUserAlerts(userId: string): Promise<Reminder[]> {
    return this.activityService.getUserAlerts(userId);
  }

  async markAlertAsRead(userId: string, alertId: string): Promise<{ success: boolean }> {
    return this.activityService.markAlertAsRead(userId, alertId);
  }

  async markAllAlertsAsRead(userId: string): Promise<{ success: boolean }> {
    return this.activityService.markAllAlertsAsRead(userId);
  }

  // Delegate to report service
  async generateReport(dto: GenerateReportDto, organizationId?: string): Promise<ReportGenerationResult> {
    return this.reportService.generateReport(dto, organizationId);
  }

  // User dashboard - kept in main service for orchestration
  async getUserDashboard(userId: string): Promise<{
    assignedTasks: Task[];
    upcomingDeadlines: Task[];
    recentReminders: Reminder[];
    taskStats: {
      total: number;
      completed: number;
      inProgress: number;
      overdue: number;
    };
  }> {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const [assignedTasks, upcomingDeadlines, recentReminders] = await Promise.all([
      this.taskRepository.find({
        where: {
          assigneeId: userId,
          status: Not(In([TaskStatus.COMPLETED, TaskStatus.CANCELLED])),
        },
        relations: ['project'],
        order: { dueDate: 'ASC' },
        take: 10,
      }),
      this.taskRepository
        .createQueryBuilder('task')
        .innerJoinAndSelect('task.project', 'project')
        .where('project.deletedAt IS NULL')
        .andWhere('task.assigneeId = :userId', { userId })
        .andWhere('task.dueDate BETWEEN :today AND :nextWeek', { today, nextWeek })
        .andWhere('task.status NOT IN (:...completedStatuses)', {
          completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
        })
        .orderBy('task.dueDate', 'ASC')
        .take(5)
        .getMany(),
      this.reminderRepository.find({
        where: { userId },
        relations: ['task', 'project'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    const [total, completed, inProgress] = await Promise.all([
      this.taskRepository.count({ where: { assigneeId: userId } }),
      this.taskRepository.count({
        where: { assigneeId: userId, status: TaskStatus.COMPLETED },
      }),
      this.taskRepository.count({
        where: { assigneeId: userId, status: TaskStatus.IN_PROGRESS },
      }),
    ]);

    const overdue = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.assigneeId = :userId', { userId })
      .andWhere('task.dueDate < :today', { today })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .getCount();

    return {
      assignedTasks,
      upcomingDeadlines,
      recentReminders,
      taskStats: {
        total,
        completed,
        inProgress,
        overdue,
      },
    };
  }

  async getMyToday(userId: string): Promise<{
    tasksForToday: Task[];
    upcomingDeadlines: Task[];
    upcomingProjectDeadlines: Project[];
    recentAlerts: any[];
    recentActivity: any[];
    totalProjects: number;
    totalPartners: number;
  }> {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw ResourceNotFoundException.forUser(userId);
    }

    // Build org filter for queries
    const orgId = user.organizationId;

    // Get today's tasks (innerJoin + deletedAt filter ensures only tasks with active projects)
    const tasksForTodayQuery = this.taskRepository
      .createQueryBuilder('task')
      .innerJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('project.deletedAt IS NULL')
      .andWhere('(task.assigneeId = :userId OR task.createdById = :userId)', { userId })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .andWhere('(task.dueDate = :todayStr OR task.dueDate < :todayStr)', { todayStr });
    if (orgId) {
      tasksForTodayQuery.andWhere('project.organizationId = :orgId', { orgId });
    }
    const tasksForToday = await tasksForTodayQuery
      .orderBy('task.dueDate', 'ASC', 'NULLS LAST')
      .addOrderBy('task.priority', 'DESC')
      .take(20)
      .getMany();

    // Get upcoming deadlines (innerJoin + deletedAt filter ensures only tasks with active projects)
    const upcomingDeadlinesQuery = this.taskRepository
      .createQueryBuilder('task')
      .innerJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('project.deletedAt IS NULL')
      .andWhere('(task.assigneeId = :userId OR task.createdById = :userId)', { userId })
      .andWhere('task.dueDate > :todayStr', { todayStr })
      .andWhere('task.dueDate <= :nextWeekStr', { nextWeekStr })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      });
    if (orgId) {
      upcomingDeadlinesQuery.andWhere('project.organizationId = :orgId', { orgId });
    }
    const upcomingDeadlines = await upcomingDeadlinesQuery
      .orderBy('task.dueDate', 'ASC')
      .take(10)
      .getMany();

    // Get upcoming project deadlines (user's projects only, exclude soft-deleted)
    const upcomingProjectDeadlinesQuery = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.manager', 'manager')
      .where('project.deletedAt IS NULL')
      .andWhere('(project.ownerId = :userId OR project.managerId = :userId)', { userId })
      .andWhere('project.endDate IS NOT NULL')
      .andWhere('project.endDate <= :nextWeekStr', { nextWeekStr })
      .andWhere('project.status NOT IN (:...completedStatuses)', {
        completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      });
    if (orgId) {
      upcomingProjectDeadlinesQuery.andWhere('project.organizationId = :orgId', { orgId });
    }
    const upcomingProjectDeadlines = await upcomingProjectDeadlinesQuery
      .orderBy('project.endDate', 'ASC')
      .take(10)
      .getMany();

    // Get recent alerts
    const alerts = await this.reminderRepository.find({
      where: { userId },
      relations: ['task', 'project'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const recentAlerts = alerts.map((alert) => ({
      id: alert.id,
      type: alert.type,
      severity: 'medium',
      message: alert.message,
      relatedId: alert.taskId || alert.projectId,
      createdAt: alert.createdAt,
      isRead: alert.isRead,
    }));

    // Get recent activity (filtered by organization)
    const recentActivities = await this.activityService.getRecentActivity(10, orgId);
    const recentActivity = recentActivities.map((activity) => ({
      id: activity.entityId,
      type: activity.type,
      action: activity.action,
      entityId: activity.entityId,
      entityName: activity.entityName,
      description: `${activity.action} ${activity.entityName}`,
      timestamp: activity.timestamp,
      userId: activity.userId,
      userName: activity.userName,
    }));

    // Get counts (always filter by organization)
    const orgFilter = orgId ? { organizationId: orgId } : {};
    const [totalProjects, totalPartners] = await Promise.all([
      this.projectRepository.count({ where: { ...orgFilter, status: Not(ProjectStatus.DRAFT) } }),
      this.partnerRepository.count({ where: { ...orgFilter, deletedAt: IsNull() } }),
    ]);

    return {
      tasksForToday,
      upcomingDeadlines,
      upcomingProjectDeadlines,
      recentAlerts,
      recentActivity,
      totalProjects,
      totalPartners,
    };
  }

  async getManagerDashboard(period: string = 'month', organizationId?: string): Promise<any> {
    const today = new Date();
    const periodStart = new Date();
    const periodEnd = new Date();

    if (period === 'week') {
      periodStart.setDate(today.getDate() - 7);
    } else if (period === 'quarter') {
      periodStart.setMonth(today.getMonth() - 3);
    } else {
      periodStart.setMonth(today.getMonth() - 1);
    }

    const [projectSummary, taskSummary, partnerPerformance] = await Promise.all([
      this.overviewService.getProjectProgress(organizationId),
      this.overviewService.getTaskDistribution(organizationId),
      this.overviewService.getPartnerPerformance(10, organizationId),
    ]);

    // Get projects at risk (exclude soft-deleted, filter by org)
    const projectsAtRiskQuery = this.projectRepository
      .createQueryBuilder('project')
      .where('project.deletedAt IS NULL')
      .andWhere('project.status = :status', { status: ProjectStatus.IN_PROGRESS })
      .andWhere('project.progress < 50')
      .andWhere('project.endDate < :futureDate', {
        futureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    if (organizationId) {
      projectsAtRiskQuery.andWhere('project.organizationId = :organizationId', { organizationId });
    }
    const projectsAtRisk = await projectsAtRiskQuery.getMany();

    const recentActivities = await this.activityService.getRecentActivity(10, organizationId);

    return {
      period,
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      projectSummary: {
        total: Object.values(projectSummary.byStatus).reduce((a, b) => a + b, 0),
        active: projectSummary.byStatus[ProjectStatus.IN_PROGRESS] || 0,
        completed: projectSummary.byStatus[ProjectStatus.COMPLETED] || 0,
        delayed: projectSummary.delayed,
        onTrack: projectSummary.onTrack,
        atRisk: projectSummary.atRisk,
      },
      taskSummary: await this.calculateTaskSummary(taskSummary, organizationId),
      partnerPerformance: await this.calculatePartnerPerformance(partnerPerformance),
      projectsAtRisk: await this.enrichProjectsAtRisk(projectsAtRisk),
      recentActivities: recentActivities.map((a) => ({
        id: a.entityId,
        type: a.type === 'task' ? 'task_completed' : 'project_updated',
        description: `${a.action} ${a.entityName}`,
        projectId: a.type === 'project' ? a.entityId : null,
        projectName: a.entityName,
        userId: a.userId,
        userName: a.userName,
        createdAt: a.timestamp,
      })),
      budgetOverview: await this.calculateBudgetOverview(organizationId),
      upcomingDeadlines: await this.getUpcomingDeadlinesForManager(organizationId),
      teamWorkload: await this.getTeamWorkload(organizationId),
    };
  }

  // Private helper methods
  private async calculateTaskSummary(taskSummary: {
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
  }, organizationId?: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
    completionRate: number;
  }> {
    const today = new Date();
    const overdueQuery = this.taskRepository
      .createQueryBuilder('task')
      .innerJoin('task.project', 'project')
      .where('task.dueDate < :today', { today })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      });
    if (organizationId) {
      overdueQuery.andWhere('project.organizationId = :organizationId', { organizationId });
    }
    const overdue = await overdueQuery.getCount();

    const total = Object.values(taskSummary.byStatus).reduce((a, b) => a + b, 0);
    const completed = taskSummary.byStatus[TaskStatus.COMPLETED] || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress: taskSummary.byStatus[TaskStatus.IN_PROGRESS] || 0,
      pending: taskSummary.byStatus[TaskStatus.TODO] || 0,
      overdue,
      completionRate,
    };
  }

  private async calculatePartnerPerformance(partners: PartnerPerformance[]): Promise<any[]> {
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
      .where('project.deletedAt IS NULL')
      .andWhere('partner.id IN (:...partnerIds)', { partnerIds })
      .andWhere('project.status = :status', { status: ProjectStatus.IN_PROGRESS })
      .groupBy('partner.id')
      .getRawMany();

    const activeProjectMap = new Map<string, number>();
    activeProjectCounts.forEach((item) => {
      activeProjectMap.set(item.partnerId, parseInt(item.count, 10));
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
    return partners.map((p) => ({
      partnerId: p.id,
      partnerName: p.name,
      activeProjects: activeProjectMap.get(p.id) || 0,
      tasksCompleted: p.completedTasks,
      tasksTotal: p.activeTasks + p.completedTasks,
      onTimeDeliveryRate: onTimeRateMap.get(p.id) || 100,
      rating: p.rating,
    }));
  }

  private async calculateBudgetOverview(organizationId?: string): Promise<{
    totalBudget: number;
    totalSpent: number;
    utilizationRate: number;
    projectBudgets: any[];
  }> {
    const where: any = { status: Not(ProjectStatus.CANCELLED) };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    const projects = await this.projectRepository.find({
      where,
      select: ['id', 'name', 'budget', 'actualCost'],
    });

    let totalBudget = 0;
    let totalSpent = 0;
    const projectBudgets = [];

    for (const project of projects) {
      const budget = project.budget || 0;
      const spent = project.actualCost || 0;
      totalBudget += budget;
      totalSpent += spent;

      if (budget > 0) {
        projectBudgets.push({
          projectId: project.id,
          projectName: project.name,
          budget,
          spent,
          utilizationRate: Math.round((spent / budget) * 100),
        });
      }
    }

    return {
      totalBudget,
      totalSpent,
      utilizationRate: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      projectBudgets,
    };
  }

  private async enrichProjectsAtRisk(projects: Project[]): Promise<any[]> {
    if (projects.length === 0) {
      return [];
    }

    const today = new Date();
    const projectIds = projects.map((p) => p.id);

    // Batch query: Get overdue task counts for all projects in one query
    const overdueTaskCounts = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.projectId', 'projectId')
      .addSelect('COUNT(*)', 'count')
      .where('task.projectId IN (:...projectIds)', { projectIds })
      .andWhere('task.dueDate < :today', { today })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .groupBy('task.projectId')
      .getRawMany();

    const overdueTaskMap = new Map<string, number>();
    overdueTaskCounts.forEach((item) => {
      overdueTaskMap.set(item.projectId, parseInt(item.count, 10));
    });

    // Build results using pre-fetched data
    return projects.map((p) => {
      const overdueTaskCount = overdueTaskMap.get(p.id) || 0;
      const endDate = new Date(p.endDate);
      endDate.setHours(0, 0, 0, 0);
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const daysRemaining = Math.round(
        (endDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24),
      );

      let riskLevel = 'medium';
      const riskReasons = [];

      if (p.progress < 30 && daysRemaining < 14) {
        riskLevel = 'critical';
        riskReasons.push('進捗が大幅に遅れています');
      } else if (p.progress < 50 && daysRemaining < 30) {
        riskLevel = 'high';
        riskReasons.push('進捗率が予定より遅れています');
      }

      if (overdueTaskCount > 5) {
        riskLevel = 'critical';
        riskReasons.push(`${overdueTaskCount}件のタスクが期限超過`);
      } else if (overdueTaskCount > 0) {
        riskReasons.push(`${overdueTaskCount}件のタスクが期限超過`);
      }

      if (daysRemaining < 7) {
        riskReasons.push('期限まで1週間以内');
      }

      return {
        id: p.id,
        name: p.name,
        status: p.status,
        progress: p.progress,
        daysRemaining,
        overdueTaskCount,
        riskLevel,
        riskReasons: riskReasons.length > 0 ? riskReasons : ['進捗の確認が必要です'],
      };
    });
  }

  private async getUpcomingDeadlinesForManager(organizationId?: string): Promise<any[]> {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .innerJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('project.deletedAt IS NULL')
      .andWhere('task.dueDate BETWEEN :today AND :nextWeek', { today, nextWeek })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      });
    if (organizationId) {
      queryBuilder.andWhere('project.organizationId = :organizationId', { organizationId });
    }
    const tasks = await queryBuilder
      .orderBy('task.dueDate', 'ASC')
      .take(10)
      .getMany();

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      projectId: t.projectId,
      projectName: t.project?.name,
      assigneeId: t.assigneeId,
      assigneeName: t.assignee?.firstName
        ? `${t.assignee.firstName} ${t.assignee.lastName}`
        : undefined,
      dueDate: t.dueDate,
      status: t.status,
      priority: t.priority,
      daysRemaining: (() => {
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      })(),
    }));
  }

  private async getTeamWorkload(organizationId?: string): Promise<any[]> {
    const today = new Date();

    // Get all users who have tasks assigned (filtered by organization)
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .innerJoin('task.project', 'project')
      .select('task.assigneeId', 'assigneeId')
      .addSelect('COUNT(*)', 'totalTasks')
      .addSelect(
        `SUM(CASE WHEN task.status = '${TaskStatus.COMPLETED}' THEN 1 ELSE 0 END)`,
        'completedTasks',
      )
      .addSelect(
        `SUM(CASE WHEN task.status = '${TaskStatus.IN_PROGRESS}' THEN 1 ELSE 0 END)`,
        'inProgressTasks',
      )
      .addSelect(
        `SUM(CASE WHEN task.dueDate < :today AND task.status NOT IN (:...completedStatuses) THEN 1 ELSE 0 END)`,
        'overdueTasks',
      )
      .where('task.assigneeId IS NOT NULL')
      .andWhere('task.deletedAt IS NULL')
      .setParameter('today', today)
      .setParameter('completedStatuses', [TaskStatus.COMPLETED, TaskStatus.CANCELLED]);
    if (organizationId) {
      queryBuilder.andWhere('project.organizationId = :organizationId', { organizationId });
    }
    const taskCounts = await queryBuilder
      .groupBy('task.assigneeId')
      .getRawMany();

    if (taskCounts.length === 0) {
      return [];
    }

    // Get user names for all assignees
    const userIds = taskCounts.map((tc) => tc.assigneeId);
    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'firstName', 'lastName', 'email'],
    });

    const userMap = new Map<string, { firstName: string; lastName: string; email: string }>();
    users.forEach((u) => {
      userMap.set(u.id, { firstName: u.firstName, lastName: u.lastName, email: u.email });
    });

    return taskCounts.map((tc) => {
      const user = userMap.get(tc.assigneeId);
      const userName = user
        ? `${user.lastName} ${user.firstName}`.trim() || user.email
        : '不明';

      return {
        userId: tc.assigneeId,
        userName,
        totalTasks: parseInt(tc.totalTasks, 10),
        completedTasks: parseInt(tc.completedTasks, 10),
        inProgressTasks: parseInt(tc.inProgressTasks, 10),
        overdueTasks: parseInt(tc.overdueTasks, 10),
      };
    });
  }
}
