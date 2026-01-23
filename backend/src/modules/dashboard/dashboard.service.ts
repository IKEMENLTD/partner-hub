import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
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
import {
  DashboardQueryDto,
  GenerateReportDto,
  ReportType,
  ReportFormat,
  ReportGenerationResult,
} from './dto';
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

      const totalDuration =
        new Date(project.endDate).getTime() - new Date(project.startDate).getTime();
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
  async getAllProjectsHealthScores(): Promise<
    Array<{
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
    }>
  > {
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
    // Use date strings for PostgreSQL date column comparison (avoid timezone issues)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // 'YYYY-MM-DD' format
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

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
        '(task.dueDate = :todayStr OR task.dueDate < :todayStr OR task.dueDate IS NULL)',
        { todayStr },
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
      .andWhere('task.dueDate > :todayStr', { todayStr })
      .andWhere('task.dueDate <= :nextWeekStr', { nextWeekStr })
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

    const recentAlerts = alerts.map((alert) => ({
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
    await this.reminderRepository.update({ id: alertId, userId }, { isRead: true });
    return { success: true };
  }

  async markAllAlertsAsRead(userId: string): Promise<{ success: boolean }> {
    await this.reminderRepository.update({ userId, isRead: false }, { isRead: true });
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
      const onTimeDeliveryRate =
        completedTasks.length > 0 ? Math.round((onTimeCount / completedTasks.length) * 100) : 100;

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
        futureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
        (new Date(p.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
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

  /**
   * Generate dashboard report
   * Supports weekly, monthly, and custom date range reports
   * Output formats: PDF, Excel, CSV
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
          throw new BadRequestException('カスタムレポートには開始日と終了日が必要です');
        }
        startDate = new Date(dto.startDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(dto.endDate);
        endDate.setHours(23, 59, 59, 999);
        break;

      default:
        throw new BadRequestException('無効なレポートタイプです');
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
        this.getOverview(),
        this.getProjectSummaries(20),
        this.getPartnerPerformance(20),
        this.getTaskDistribution(),
        this.getOverdueItems(),
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
   * Generate report file in the specified format
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

    switch (format) {
      case ReportFormat.CSV:
        return this.generateCsvReport(data, baseFileName);

      case ReportFormat.EXCEL:
        return this.generateExcelReport(data, baseFileName);

      case ReportFormat.PDF:
      default:
        return this.generatePdfReport(data, baseFileName, reportTypeName, startDate, endDate);
    }
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
    lines.push('=== 案件サマリー ===');
    lines.push('案件名,ステータス,進捗率,終了日,タスク数,完了タスク,期限超過タスク');
    for (const project of data.projectSummaries) {
      lines.push(
        `"${project.name}",${project.status},${project.progress}%,${
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
    lines.push('=== タスク分布 ===');
    lines.push('ステータス別:');
    for (const [status, count] of Object.entries(data.taskDistribution.byStatus)) {
      lines.push(`${status},${count}`);
    }
    lines.push('');
    lines.push('優先度別:');
    for (const [priority, count] of Object.entries(data.taskDistribution.byPriority)) {
      lines.push(`${priority},${count}`);
    }

    const csvContent = bom + lines.join('\n');

    return {
      fileName: `${baseFileName}.csv`,
      fileContent: Buffer.from(csvContent, 'utf-8'),
      mimeType: 'text/csv; charset=utf-8',
    };
  }

  /**
   * Generate Excel report (simplified as CSV with .xlsx extension for now)
   * In production, use a library like exceljs
   */
  private generateExcelReport(
    data: any,
    baseFileName: string,
  ): { fileName: string; fileContent: Buffer; mimeType: string } {
    // For simplicity, generate CSV format that Excel can open
    // In production, use exceljs or similar library
    const csvResult = this.generateCsvReport(data, baseFileName);

    return {
      fileName: `${baseFileName}.xlsx`,
      fileContent: csvResult.fileContent,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /**
   * Generate PDF report (simplified as text for now)
   * In production, use a library like pdfkit or puppeteer
   */
  private generatePdfReport(
    data: any,
    baseFileName: string,
    reportTypeName: string,
    startDate: Date,
    endDate: Date,
  ): { fileName: string; fileContent: Buffer; mimeType: string } {
    // For simplicity, generate a text-based report
    // In production, use pdfkit, puppeteer, or similar library
    const lines: string[] = [];

    lines.push('=====================================');
    lines.push(`    ダッシュボード${reportTypeName}レポート`);
    lines.push('=====================================');
    lines.push('');
    lines.push(`期間: ${data.periodStart} 〜 ${data.periodEnd}`);
    lines.push(`生成日時: ${new Date().toLocaleString('ja-JP')}`);
    lines.push('');
    lines.push('-------------------------------------');
    lines.push('  概要');
    lines.push('-------------------------------------');
    lines.push(`  総案件数:           ${data.overview.totalProjects}`);
    lines.push(`  進行中案件:         ${data.overview.activeProjects}`);
    lines.push(`  完了案件:           ${data.overview.completedProjects}`);
    lines.push(`  総タスク数:         ${data.overview.totalTasks}`);
    lines.push(`  完了タスク:         ${data.overview.completedTasks}`);
    lines.push(`  未完了タスク:       ${data.overview.pendingTasks}`);
    lines.push(`  期限超過タスク:     ${data.overview.overdueTasks}`);
    lines.push(`  総パートナー数:     ${data.overview.totalPartners}`);
    lines.push(`  アクティブパートナー: ${data.overview.activePartners}`);
    lines.push('');

    // Completion rates
    const projectCompletionRate =
      data.overview.totalProjects > 0
        ? Math.round((data.overview.completedProjects / data.overview.totalProjects) * 100)
        : 0;
    const taskCompletionRate =
      data.overview.totalTasks > 0
        ? Math.round((data.overview.completedTasks / data.overview.totalTasks) * 100)
        : 0;

    lines.push('-------------------------------------');
    lines.push('  完了率');
    lines.push('-------------------------------------');
    lines.push(`  案件完了率:         ${projectCompletionRate}%`);
    lines.push(`  タスク完了率:       ${taskCompletionRate}%`);
    lines.push('');

    lines.push('-------------------------------------');
    lines.push('  案件サマリー (上位10件)');
    lines.push('-------------------------------------');
    const topProjects = data.projectSummaries.slice(0, 10);
    for (const project of topProjects) {
      lines.push(`  ${project.name}`);
      lines.push(`    ステータス: ${project.status} | 進捗: ${project.progress}%`);
      lines.push(`    タスク: ${project.completedTasksCount}/${project.tasksCount} 完了`);
      if (project.overdueTasksCount > 0) {
        lines.push(`    ※ 期限超過タスク: ${project.overdueTasksCount}件`);
      }
      lines.push('');
    }

    lines.push('-------------------------------------');
    lines.push('  パートナーパフォーマンス (上位5名)');
    lines.push('-------------------------------------');
    const topPartners = data.partnerPerformance.slice(0, 5);
    for (const partner of topPartners) {
      lines.push(`  ${partner.name}`);
      lines.push(`    評価: ${partner.rating} | 完了タスク: ${partner.completedTasks}`);
      lines.push('');
    }

    if (data.overdueItems.tasks.length > 0) {
      lines.push('-------------------------------------');
      lines.push('  期限超過タスク一覧');
      lines.push('-------------------------------------');
      for (const task of data.overdueItems.tasks.slice(0, 10)) {
        lines.push(`  - ${task.title}`);
        lines.push(
          `    期限: ${task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '-'}`,
        );
      }
      lines.push('');
    }

    lines.push('=====================================');
    lines.push('         レポート終了');
    lines.push('=====================================');

    const pdfContent = lines.join('\n');

    return {
      fileName: `${baseFileName}.pdf`,
      fileContent: Buffer.from(pdfContent, 'utf-8'),
      mimeType: 'application/pdf',
    };
  }
}
