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

  async getProjectSummaries(limit: number = 10): Promise<ProjectSummary[]> {
    return this.overviewService.getProjectSummaries(limit);
  }

  async getPartnerPerformance(limit: number = 10): Promise<PartnerPerformance[]> {
    return this.overviewService.getPartnerPerformance(limit);
  }

  async getUpcomingDeadlines(days: number = 7): Promise<{
    projects: Project[];
    tasks: Task[];
  }> {
    return this.overviewService.getUpcomingDeadlines(days);
  }

  async getOverdueItems(): Promise<{
    projects: Project[];
    tasks: Task[];
  }> {
    return this.overviewService.getOverdueItems();
  }

  async getTaskDistribution(): Promise<{
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
  }> {
    return this.overviewService.getTaskDistribution();
  }

  async getProjectProgress(): Promise<{
    byStatus: Record<string, number>;
    averageProgress: number;
    onTrack: number;
    atRisk: number;
    delayed: number;
    healthScoreStats: any;
  }> {
    return this.overviewService.getProjectProgress();
  }

  async getHealthScoreStatistics() {
    return this.overviewService.getHealthScoreStatistics();
  }

  async getAllProjectsHealthScores() {
    return this.overviewService.getAllProjectsHealthScores();
  }

  // Delegate to activity service
  async getRecentActivity(limit: number = 20): Promise<ActivityItem[]> {
    return this.activityService.getRecentActivity(limit);
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
  async generateReport(dto: GenerateReportDto): Promise<ReportGenerationResult> {
    return this.reportService.generateReport(dto);
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
        .leftJoinAndSelect('task.project', 'project')
        .where('task.assigneeId = :userId', { userId })
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

    // Get today's tasks
    const tasksForToday = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('(task.assigneeId = :userId OR task.createdById = :userId)', { userId })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .andWhere('(task.dueDate = :todayStr OR task.dueDate < :todayStr)', { todayStr })
      .orderBy('task.dueDate', 'ASC', 'NULLS LAST')
      .addOrderBy('task.priority', 'DESC')
      .take(20)
      .getMany();

    // Get upcoming deadlines
    const upcomingDeadlines = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('(task.assigneeId = :userId OR task.createdById = :userId)', { userId })
      .andWhere('task.dueDate > :todayStr', { todayStr })
      .andWhere('task.dueDate <= :nextWeekStr', { nextWeekStr })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .orderBy('task.dueDate', 'ASC')
      .take(10)
      .getMany();

    // Get upcoming project deadlines
    const upcomingProjectDeadlines = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.manager', 'manager')
      .where('project.endDate IS NOT NULL')
      .andWhere('project.endDate <= :nextWeekStr', { nextWeekStr })
      .andWhere('project.status NOT IN (:...completedStatuses)', {
        completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      })
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

    // Get recent activity
    const recentActivities = await this.activityService.getRecentActivity(10);
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

    // Get counts
    const orgFilter = user.organizationId ? { organizationId: user.organizationId } : {};
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

  async getManagerDashboard(period: string = 'month'): Promise<any> {
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
      this.overviewService.getProjectProgress(),
      this.overviewService.getTaskDistribution(),
      this.overviewService.getPartnerPerformance(10),
    ]);

    // Get projects at risk
    const projectsAtRisk = await this.projectRepository
      .createQueryBuilder('project')
      .where('project.status = :status', { status: ProjectStatus.IN_PROGRESS })
      .andWhere('project.progress < 50')
      .andWhere('project.endDate < :futureDate', {
        futureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .getMany();

    const recentActivities = await this.activityService.getRecentActivity(10);

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
      taskSummary: await this.calculateTaskSummary(taskSummary),
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
      budgetOverview: await this.calculateBudgetOverview(),
      upcomingDeadlines: await this.getUpcomingDeadlinesForManager(),
    };
  }

  // Private helper methods
  private async calculateTaskSummary(taskSummary: {
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
  }): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
    completionRate: number;
  }> {
    const today = new Date();
    const overdue = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.dueDate < :today', { today })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .getCount();

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
      .where('partner.id IN (:...partnerIds)', { partnerIds })
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

  private async calculateBudgetOverview(): Promise<{
    totalBudget: number;
    totalSpent: number;
    utilizationRate: number;
    projectBudgets: any[];
  }> {
    const projects = await this.projectRepository.find({
      where: { status: Not(ProjectStatus.CANCELLED) },
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
      const daysRemaining = Math.floor(
        (new Date(p.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
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

  private async getUpcomingDeadlinesForManager(): Promise<any[]> {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const tasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.dueDate BETWEEN :today AND :nextWeek', { today, nextWeek })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
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
      priority: t.priority,
      daysRemaining: Math.floor(
        (new Date(t.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    }));
  }
}
