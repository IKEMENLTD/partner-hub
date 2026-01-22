import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, In, Not } from 'typeorm';
import { Project } from '../project/entities/project.entity';
import { Task } from '../task/entities/task.entity';
import { Partner } from '../partner/entities/partner.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { Reminder } from '../reminder/entities/reminder.entity';
import { ProjectStatus } from '../project/enums/project-status.enum';
import { TaskStatus } from '../task/enums/task-status.enum';
import { PartnerStatus } from '../partner/enums/partner-status.enum';
import { ReminderStatus } from '../reminder/enums/reminder-type.enum';
import { DashboardQueryDto } from './dto';
import { HealthScoreService } from '../project/services/health-score.service';

export interface DashboardOverview {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  totalPartners: number;
  activePartners: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  progress: number;
  endDate: Date;
  tasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
}

export interface PartnerPerformance {
  id: string;
  name: string;
  email: string;
  rating: number;
  totalProjects: number;
  completedProjects: number;
  activeTasks: number;
  completedTasks: number;
}

export interface ActivityItem {
  type: 'project' | 'task' | 'partner' | 'reminder';
  action: string;
  entityId: string;
  entityName: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
}

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
    @Inject(forwardRef(() => HealthScoreService))
    private healthScoreService: HealthScoreService,
  ) {}

  async getOverview(userId?: string): Promise<DashboardOverview> {
    const today = new Date();

    // Projects statistics
    const [totalProjects, activeProjects, completedProjects] = await Promise.all([
      this.projectRepository.count(),
      this.projectRepository.count({
        where: { status: ProjectStatus.IN_PROGRESS },
      }),
      this.projectRepository.count({
        where: { status: ProjectStatus.COMPLETED },
      }),
    ]);

    // Tasks statistics
    const [totalTasks, taskTodo, taskInProgress, completedTasks] = await Promise.all([
      this.taskRepository.count(),
      this.taskRepository.count({ where: { status: TaskStatus.TODO } }),
      this.taskRepository.count({ where: { status: TaskStatus.IN_PROGRESS } }),
      this.taskRepository.count({ where: { status: TaskStatus.COMPLETED } }),
    ]);

    // pendingTasks = TODO + IN_PROGRESS
    const pendingTasks = taskTodo + taskInProgress;

    const overdueTasks = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.dueDate < :today', { today })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .getCount();

    // Partners statistics
    const [totalPartners, activePartners] = await Promise.all([
      this.partnerRepository.count(),
      this.partnerRepository.count({ where: { status: PartnerStatus.ACTIVE } }),
    ]);

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      totalPartners,
      activePartners,
    };
  }

  async getProjectSummaries(limit: number = 10): Promise<ProjectSummary[]> {
    const projects = await this.projectRepository.find({
      where: {
        status: Not(In([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED])),
      },
      order: { endDate: 'ASC' },
      take: limit,
    });

    const summaries: ProjectSummary[] = [];

    for (const project of projects) {
      const [tasksCount, completedTasksCount, overdueTasksCount] = await Promise.all([
        this.taskRepository.count({ where: { projectId: project.id } }),
        this.taskRepository.count({
          where: { projectId: project.id, status: TaskStatus.COMPLETED },
        }),
        this.taskRepository
          .createQueryBuilder('task')
          .where('task.projectId = :projectId', { projectId: project.id })
          .andWhere('task.dueDate < :today', { today: new Date() })
          .andWhere('task.status NOT IN (:...completedStatuses)', {
            completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
          })
          .getCount(),
      ]);

      summaries.push({
        id: project.id,
        name: project.name,
        status: project.status,
        progress: project.progress,
        endDate: project.endDate,
        tasksCount,
        completedTasksCount,
        overdueTasksCount,
      });
    }

    return summaries;
  }

  async getPartnerPerformance(limit: number = 10): Promise<PartnerPerformance[]> {
    const partners = await this.partnerRepository.find({
      where: { status: PartnerStatus.ACTIVE },
      order: { rating: 'DESC' },
      take: limit,
    });

    const performances: PartnerPerformance[] = [];

    for (const partner of partners) {
      const [activeTasks, completedTasks] = await Promise.all([
        this.taskRepository.count({
          where: {
            partnerId: partner.id,
            status: Not(In([TaskStatus.COMPLETED, TaskStatus.CANCELLED])),
          },
        }),
        this.taskRepository.count({
          where: { partnerId: partner.id, status: TaskStatus.COMPLETED },
        }),
      ]);

      performances.push({
        id: partner.id,
        name: partner.name,
        email: partner.email,
        rating: partner.rating,
        totalProjects: partner.totalProjects,
        completedProjects: partner.completedProjects,
        activeTasks,
        completedTasks,
      });
    }

    return performances;
  }

  async getUpcomingDeadlines(days: number = 7): Promise<{
    projects: Project[];
    tasks: Task[];
  }> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const [projects, tasks] = await Promise.all([
      this.projectRepository
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.manager', 'manager')
        .where('project.endDate BETWEEN :today AND :futureDate', { today, futureDate })
        .andWhere('project.status NOT IN (:...completedStatuses)', {
          completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
        })
        .orderBy('project.endDate', 'ASC')
        .take(10)
        .getMany(),
      this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .leftJoinAndSelect('task.project', 'project')
        .where('task.dueDate BETWEEN :today AND :futureDate', { today, futureDate })
        .andWhere('task.status NOT IN (:...completedStatuses)', {
          completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
        })
        .orderBy('task.dueDate', 'ASC')
        .take(10)
        .getMany(),
    ]);

    return { projects, tasks };
  }

  async getOverdueItems(): Promise<{
    projects: Project[];
    tasks: Task[];
  }> {
    const today = new Date();

    const [projects, tasks] = await Promise.all([
      this.projectRepository
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.manager', 'manager')
        .where('project.endDate < :today', { today })
        .andWhere('project.status NOT IN (:...completedStatuses)', {
          completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
        })
        .orderBy('project.endDate', 'ASC')
        .getMany(),
      this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .leftJoinAndSelect('task.project', 'project')
        .where('task.dueDate < :today', { today })
        .andWhere('task.status NOT IN (:...completedStatuses)', {
          completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
        })
        .orderBy('task.dueDate', 'ASC')
        .getMany(),
    ]);

    return { projects, tasks };
  }

  async getRecentActivity(limit: number = 20): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = [];

    // Get recent projects
    const recentProjects = await this.projectRepository.find({
      relations: ['createdBy'],
      order: { updatedAt: 'DESC' },
      take: limit / 4,
    });

    for (const project of recentProjects) {
      activities.push({
        type: 'project',
        action: project.createdAt.getTime() === project.updatedAt.getTime() ? 'created' : 'updated',
        entityId: project.id,
        entityName: project.name,
        timestamp: project.updatedAt,
        userId: project.createdById,
        userName: project.createdBy?.firstName
          ? `${project.createdBy.firstName} ${project.createdBy.lastName}`
          : undefined,
      });
    }

    // Get recent tasks
    const recentTasks = await this.taskRepository.find({
      relations: ['createdBy'],
      order: { updatedAt: 'DESC' },
      take: limit / 4,
    });

    for (const task of recentTasks) {
      activities.push({
        type: 'task',
        action: task.createdAt.getTime() === task.updatedAt.getTime() ? 'created' : 'updated',
        entityId: task.id,
        entityName: task.title,
        timestamp: task.updatedAt,
        userId: task.createdById,
        userName: task.createdBy?.firstName
          ? `${task.createdBy.firstName} ${task.createdBy.lastName}`
          : undefined,
      });
    }

    // Get recent partners
    const recentPartners = await this.partnerRepository.find({
      relations: ['createdBy'],
      order: { updatedAt: 'DESC' },
      take: limit / 4,
    });

    for (const partner of recentPartners) {
      activities.push({
        type: 'partner',
        action: partner.createdAt.getTime() === partner.updatedAt.getTime() ? 'created' : 'updated',
        entityId: partner.id,
        entityName: partner.name,
        timestamp: partner.updatedAt,
        userId: partner.createdById,
        userName: partner.createdBy?.firstName
          ? `${partner.createdBy.firstName} ${partner.createdBy.lastName}`
          : undefined,
      });
    }

    // Sort by timestamp
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return activities.slice(0, limit);
  }

  async getTaskDistribution(): Promise<{
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const [statusCounts, priorityCounts, typeCounts] = await Promise.all([
      this.taskRepository
        .createQueryBuilder('task')
        .select('task.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('task.status')
        .getRawMany(),
      this.taskRepository
        .createQueryBuilder('task')
        .select('task.priority', 'priority')
        .addSelect('COUNT(*)', 'count')
        .groupBy('task.priority')
        .getRawMany(),
      this.taskRepository
        .createQueryBuilder('task')
        .select('task.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('task.type')
        .getRawMany(),
    ]);

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((item) => {
      byStatus[item.status] = parseInt(item.count, 10);
    });

    const byPriority: Record<string, number> = {};
    priorityCounts.forEach((item) => {
      byPriority[item.priority] = parseInt(item.count, 10);
    });

    const byType: Record<string, number> = {};
    typeCounts.forEach((item) => {
      byType[item.type] = parseInt(item.count, 10);
    });

    return { byStatus, byPriority, byType };
  }

  async getProjectProgress(): Promise<{
    byStatus: Record<string, number>;
    averageProgress: number;
    onTrack: number;
    atRisk: number;
    delayed: number;
    healthScoreStats: {
      averageScore: number;
      scoreDistribution: {
        excellent: number;
        good: number;
        fair: number;
        poor: number;
      };
      projectsAtRisk: number;
      totalProjects: number;
      averageOnTimeRate: number;
      averageCompletionRate: number;
      averageBudgetHealth: number;
    };
  }> {
    const today = new Date();

    const statusCounts = await this.projectRepository
      .createQueryBuilder('project')
      .select('project.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('project.status')
      .getRawMany();

    const avgProgress = await this.projectRepository
      .createQueryBuilder('project')
      .select('AVG(project.progress)', 'avg')
      .getRawOne();

    // Projects on track: progress >= expected progress based on timeline
    const projects = await this.projectRepository.find({
      where: {
        status: Not(In([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED])),
      },
    });

    let onTrack = 0;
    let atRisk = 0;
    let delayed = 0;

    for (const project of projects) {
      if (!project.startDate || !project.endDate) {
        continue;
      }

      const totalDuration = new Date(project.endDate).getTime() - new Date(project.startDate).getTime();
      const elapsed = today.getTime() - new Date(project.startDate).getTime();
      const expectedProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

      if (project.progress >= expectedProgress - 10) {
        onTrack++;
      } else if (project.progress >= expectedProgress - 25) {
        atRisk++;
      } else {
        delayed++;
      }
    }

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((item) => {
      byStatus[item.status] = parseInt(item.count, 10);
    });

    // Get health score statistics from HealthScoreService
    const healthScoreStats = await this.healthScoreService.getHealthScoreStatistics();

    return {
      byStatus,
      averageProgress: parseFloat(avgProgress?.avg || '0'),
      onTrack,
      atRisk,
      delayed,
      healthScoreStats,
    };
  }

  /**
   * Get health score statistics for all projects
   * Uses the new health score calculation formula:
   * HealthScore = (50 * OnTimeRate + 30 * CompletionRate + 20 * BudgetHealth) / 100
   */
  async getHealthScoreStatistics(): Promise<{
    averageScore: number;
    scoreDistribution: {
      excellent: number;
      good: number;
      fair: number;
      poor: number;
    };
    projectsAtRisk: number;
    totalProjects: number;
    averageOnTimeRate: number;
    averageCompletionRate: number;
    averageBudgetHealth: number;
  }> {
    return this.healthScoreService.getHealthScoreStatistics();
  }

  /**
   * Get detailed health score breakdown for all active projects
   */
  async getAllProjectsHealthScores(): Promise<Array<{
    projectId: string;
    projectName: string;
    healthScore: number;
    breakdown: {
      onTimeRate: number;
      completionRate: number;
      budgetHealth: number;
      totalScore: number;
      details: {
        totalTasks: number;
        completedTasks: number;
        onTimeCompletedTasks: number;
        budget: number;
        actualCost: number;
      };
    };
  }>> {
    return this.healthScoreService.getAllProjectsHealthScores();
  }

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
    recentAlerts: any[];
    recentActivity: any[];
    totalProjects: number;
    totalPartners: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    // Get today's tasks (tasksForToday)
    // Include: tasks due today, overdue tasks, and in-progress tasks without due date
    const tasksForToday = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.assigneeId = :userId', { userId })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .andWhere(
        '(task.dueDate BETWEEN :today AND :tomorrow OR task.dueDate < :today OR task.dueDate IS NULL)',
        { today, tomorrow }
      )
      .orderBy('task.dueDate', 'ASC', 'NULLS LAST')
      .addOrderBy('task.priority', 'DESC')
      .take(20)
      .getMany();

    // Get upcoming deadlines (tasks due in next 7 days, excluding today)
    const upcomingDeadlines = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.assigneeId = :userId', { userId })
      .andWhere('task.dueDate > :tomorrow', { tomorrow })
      .andWhere('task.dueDate <= :nextWeek', { nextWeek })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .orderBy('task.dueDate', 'ASC')
      .take(10)
      .getMany();

    // Get recent alerts
    const alerts = await this.reminderRepository.find({
      where: { userId },
      relations: ['task', 'project'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const recentAlerts = alerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      severity: 'medium',
      message: alert.message,
      relatedId: alert.taskId || alert.projectId,
      createdAt: alert.createdAt,
      isRead: alert.isRead,
    }));

    // Get recent activity (timeline events)
    const recentActivities = await this.getRecentActivity(10);
    const recentActivity = recentActivities.map(activity => ({
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

    // Get total projects and partners count
    const [totalProjects, totalPartners] = await Promise.all([
      this.projectRepository.count(),
      this.partnerRepository.count(),
    ]);

    return {
      tasksForToday,
      upcomingDeadlines,
      recentAlerts,
      recentActivity,
      totalProjects,
      totalPartners,
    };
  }

  async getUserAlerts(userId: string): Promise<Reminder[]> {
    return this.reminderRepository.find({
      where: { userId },
      relations: ['task', 'project'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markAlertAsRead(userId: string, alertId: string): Promise<{ success: boolean }> {
    await this.reminderRepository.update(
      { id: alertId, userId },
      { isRead: true },
    );
    return { success: true };
  }

  async markAllAlertsAsRead(userId: string): Promise<{ success: boolean }> {
    await this.reminderRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { success: true };
  }

  /**
   * Calculate task summary with overdue count and completion rate
   */
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

  /**
   * Calculate partner performance with project counts
   */
  private async calculatePartnerPerformance(partners: PartnerPerformance[]): Promise<any[]> {
    const result = [];
    for (const p of partners) {
      // Calculate active projects for this partner
      const activeProjects = await this.projectRepository
        .createQueryBuilder('project')
        .leftJoin('project.partners', 'partner')
        .where('partner.id = :partnerId', { partnerId: p.id })
        .andWhere('project.status = :status', { status: ProjectStatus.IN_PROGRESS })
        .getCount();

      // Calculate on-time delivery rate
      const completedTasks = await this.taskRepository.find({
        where: { partnerId: p.id, status: TaskStatus.COMPLETED },
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
      const onTimeDeliveryRate = completedTasks.length > 0
        ? Math.round((onTimeCount / completedTasks.length) * 100)
        : 100;

      result.push({
        partnerId: p.id,
        partnerName: p.name,
        activeProjects,
        tasksCompleted: p.completedTasks,
        tasksTotal: p.activeTasks + p.completedTasks,
        onTimeDeliveryRate,
        rating: p.rating,
      });
    }
    return result;
  }

  /**
   * Calculate budget overview for all projects
   */
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

  async getManagerDashboard(period: string = 'month'): Promise<any> {
    const today = new Date();
    let periodStart = new Date();
    let periodEnd = new Date();

    if (period === 'week') {
      periodStart.setDate(today.getDate() - 7);
    } else if (period === 'quarter') {
      periodStart.setMonth(today.getMonth() - 3);
    } else {
      periodStart.setMonth(today.getMonth() - 1);
    }

    const [projectSummary, taskSummary, partnerPerformance] = await Promise.all([
      this.getProjectProgress(),
      this.getTaskDistribution(),
      this.getPartnerPerformance(10),
    ]);

    // Get projects at risk
    const projectsAtRisk = await this.projectRepository
      .createQueryBuilder('project')
      .where('project.status = :status', { status: ProjectStatus.IN_PROGRESS })
      .andWhere('project.progress < 50')
      .andWhere('project.endDate < :futureDate', {
        futureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
      .getMany();

    const recentActivities = await this.getRecentActivity(10);

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
      recentActivities: recentActivities.map(a => ({
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

  /**
   * Enrich projects at risk with overdue task counts
   */
  private async enrichProjectsAtRisk(projects: Project[]): Promise<any[]> {
    const today = new Date();
    const result = [];

    for (const p of projects) {
      const overdueTaskCount = await this.taskRepository
        .createQueryBuilder('task')
        .where('task.projectId = :projectId', { projectId: p.id })
        .andWhere('task.dueDate < :today', { today })
        .andWhere('task.status NOT IN (:...completedStatuses)', {
          completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
        })
        .getCount();

      const daysRemaining = Math.floor(
        (new Date(p.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Determine risk level based on multiple factors
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

      result.push({
        id: p.id,
        name: p.name,
        status: p.status,
        progress: p.progress,
        daysRemaining,
        overdueTaskCount,
        riskLevel,
        riskReasons: riskReasons.length > 0 ? riskReasons : ['進捗の確認が必要です'],
      });
    }

    return result;
  }

  /**
   * Get upcoming deadlines for manager dashboard
   */
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

    return tasks.map(t => ({
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
        (new Date(t.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
    }));
  }
}
