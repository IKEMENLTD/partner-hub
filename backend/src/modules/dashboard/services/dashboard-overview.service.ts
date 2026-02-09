import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, IsNull } from 'typeorm';
import { Project } from '../../project/entities/project.entity';
import { Task } from '../../task/entities/task.entity';
import { Partner } from '../../partner/entities/partner.entity';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { ProjectStatus } from '../../project/enums/project-status.enum';
import { TaskStatus } from '../../task/enums/task-status.enum';
import { PartnerStatus } from '../../partner/enums/partner-status.enum';
import { HealthScoreService } from '../../project/services/health-score.service';

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

@Injectable()
export class DashboardOverviewService {
  private readonly logger = new Logger(DashboardOverviewService.name);

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(UserProfile)
    private userRepository: Repository<UserProfile>,
    @Inject(forwardRef(() => HealthScoreService))
    private healthScoreService: HealthScoreService,
  ) {}

  async getOverview(userId?: string): Promise<DashboardOverview> {
    const today = new Date();

    // Get organization filter if userId is provided
    let orgFilter: { organizationId?: string } = {};
    if (userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user?.organizationId) {
        orgFilter = { organizationId: user.organizationId };
      }
    }

    // Projects statistics (filtered by organization, excluding drafts)
    const [totalProjects, activeProjects, completedProjects] = await Promise.all([
      this.projectRepository.count({ where: { ...orgFilter, status: Not(ProjectStatus.DRAFT) } }),
      this.projectRepository.count({
        where: { ...orgFilter, status: ProjectStatus.IN_PROGRESS },
      }),
      this.projectRepository.count({
        where: { ...orgFilter, status: ProjectStatus.COMPLETED },
      }),
    ]);

    // Tasks statistics - filter by projects in the organization
    const [totalTasks, taskTodo, taskInProgress, completedTasks] = await Promise.all([
      this.taskRepository
        .createQueryBuilder('task')
        .leftJoin('task.project', 'project')
        .where(orgFilter.organizationId ? 'project.organizationId = :orgId' : '1=1', {
          orgId: orgFilter.organizationId,
        })
        .getCount(),
      this.taskRepository
        .createQueryBuilder('task')
        .leftJoin('task.project', 'project')
        .where('task.status = :status', { status: TaskStatus.TODO })
        .andWhere(orgFilter.organizationId ? 'project.organizationId = :orgId' : '1=1', {
          orgId: orgFilter.organizationId,
        })
        .getCount(),
      this.taskRepository
        .createQueryBuilder('task')
        .leftJoin('task.project', 'project')
        .where('task.status = :status', { status: TaskStatus.IN_PROGRESS })
        .andWhere(orgFilter.organizationId ? 'project.organizationId = :orgId' : '1=1', {
          orgId: orgFilter.organizationId,
        })
        .getCount(),
      this.taskRepository
        .createQueryBuilder('task')
        .leftJoin('task.project', 'project')
        .where('task.status = :status', { status: TaskStatus.COMPLETED })
        .andWhere(orgFilter.organizationId ? 'project.organizationId = :orgId' : '1=1', {
          orgId: orgFilter.organizationId,
        })
        .getCount(),
    ]);

    // pendingTasks = TODO + IN_PROGRESS
    const pendingTasks = taskTodo + taskInProgress;

    const overdueTasksQuery = this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.project', 'project')
      .where('task.dueDate < :today', { today })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      });
    if (orgFilter.organizationId) {
      overdueTasksQuery.andWhere('project.organizationId = :orgId', {
        orgId: orgFilter.organizationId,
      });
    }
    const overdueTasks = await overdueTasksQuery.getCount();

    // Partners statistics (filtered by organization)
    const [totalPartners, activePartners] = await Promise.all([
      this.partnerRepository.count({ where: { ...orgFilter, deletedAt: IsNull() } }),
      this.partnerRepository.count({
        where: { ...orgFilter, status: PartnerStatus.ACTIVE, deletedAt: IsNull() },
      }),
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

    if (projects.length === 0) {
      return [];
    }

    const projectIds = projects.map((p) => p.id);
    const today = new Date();

    // Batch query: Get all task stats for all projects in one query
    const taskStats = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.projectId', 'projectId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN task.status = '${TaskStatus.COMPLETED}' THEN 1 ELSE 0 END)`,
        'completed',
      )
      .addSelect(
        `SUM(CASE WHEN task.dueDate < :today AND task.status NOT IN (:...completedStatuses) THEN 1 ELSE 0 END)`,
        'overdue',
      )
      .where('task.projectId IN (:...projectIds)', { projectIds })
      .setParameter('today', today)
      .setParameter('completedStatuses', [TaskStatus.COMPLETED, TaskStatus.CANCELLED])
      .groupBy('task.projectId')
      .getRawMany();

    const taskStatsMap = new Map<string, { total: number; completed: number; overdue: number }>();
    taskStats.forEach((item) => {
      taskStatsMap.set(item.projectId, {
        total: parseInt(item.total, 10) || 0,
        completed: parseInt(item.completed, 10) || 0,
        overdue: parseInt(item.overdue, 10) || 0,
      });
    });

    // Build results using pre-fetched data
    const summaries: ProjectSummary[] = projects.map((project) => {
      const stats = taskStatsMap.get(project.id) || { total: 0, completed: 0, overdue: 0 };
      return {
        id: project.id,
        name: project.name,
        status: project.status,
        progress: project.progress,
        endDate: project.endDate,
        tasksCount: stats.total,
        completedTasksCount: stats.completed,
        overdueTasksCount: stats.overdue,
      };
    });

    return summaries;
  }

  async getPartnerPerformance(limit: number = 10): Promise<PartnerPerformance[]> {
    const partners = await this.partnerRepository.find({
      where: { status: PartnerStatus.ACTIVE },
      order: { rating: 'DESC' },
      take: limit,
    });

    if (partners.length === 0) {
      return [];
    }

    const partnerIds = partners.map((p) => p.id);

    // Batch query: Get task stats for all partners in one query
    const taskStats = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.partnerId', 'partnerId')
      .addSelect(
        `SUM(CASE WHEN task.status NOT IN ('${TaskStatus.COMPLETED}', '${TaskStatus.CANCELLED}') THEN 1 ELSE 0 END)`,
        'active',
      )
      .addSelect(
        `SUM(CASE WHEN task.status = '${TaskStatus.COMPLETED}' THEN 1 ELSE 0 END)`,
        'completed',
      )
      .where('task.partnerId IN (:...partnerIds)', { partnerIds })
      .groupBy('task.partnerId')
      .getRawMany();

    const taskStatsMap = new Map<string, { active: number; completed: number }>();
    taskStats.forEach((item) => {
      taskStatsMap.set(item.partnerId, {
        active: parseInt(item.active, 10) || 0,
        completed: parseInt(item.completed, 10) || 0,
      });
    });

    // Build results using pre-fetched data
    const performances: PartnerPerformance[] = partners.map((partner) => {
      const stats = taskStatsMap.get(partner.id) || { active: 0, completed: 0 };
      return {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        rating: partner.rating,
        totalProjects: partner.totalProjects,
        completedProjects: partner.completedProjects,
        activeTasks: stats.active,
        completedTasks: stats.completed,
      };
    });

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
        .where('project.deletedAt IS NULL')
        .andWhere('project.endDate BETWEEN :today AND :futureDate', { today, futureDate })
        .andWhere('project.status NOT IN (:...completedStatuses)', {
          completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
        })
        .orderBy('project.endDate', 'ASC')
        .take(10)
        .getMany(),
      this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .innerJoinAndSelect('task.project', 'project')
        .where('project.deletedAt IS NULL')
        .andWhere('task.dueDate BETWEEN :today AND :futureDate', { today, futureDate })
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
        .where('project.deletedAt IS NULL')
        .andWhere('project.endDate < :today', { today })
        .andWhere('project.status NOT IN (:...completedStatuses)', {
          completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
        })
        .orderBy('project.endDate', 'ASC')
        .getMany(),
      this.taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .innerJoinAndSelect('task.project', 'project')
        .where('project.deletedAt IS NULL')
        .andWhere('task.dueDate < :today', { today })
        .andWhere('task.status NOT IN (:...completedStatuses)', {
          completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
        })
        .orderBy('task.dueDate', 'ASC')
        .getMany(),
    ]);

    return { projects, tasks };
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
      .where('project.deletedAt IS NULL')
      .select('project.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('project.status')
      .getRawMany();

    const avgProgress = await this.projectRepository
      .createQueryBuilder('project')
      .where('project.deletedAt IS NULL')
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
}
