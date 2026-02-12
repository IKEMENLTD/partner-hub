import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectStatus } from '../enums/project-status.enum';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';

@Injectable()
export class ProjectStatisticsService {
  private readonly logger = new Logger(ProjectStatisticsService.name);

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async getProjectStatistics(organizationId?: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageProgress: number;
    totalBudget: number;
    totalActualCost: number;
  }> {
    const orgFilter: any = organizationId ? { organizationId } : {};

    const total = await this.projectRepository.count({ where: { ...orgFilter } });

    const statusQb = this.projectRepository
      .createQueryBuilder('project')
      .select('project.status', 'status')
      .addSelect('COUNT(*)', 'count');
    if (organizationId) {
      statusQb.where('project.organizationId = :orgId', { orgId: organizationId });
    }
    const statusCounts = await statusQb.groupBy('project.status').getRawMany();

    const priorityQb = this.projectRepository
      .createQueryBuilder('project')
      .select('project.priority', 'priority')
      .addSelect('COUNT(*)', 'count');
    if (organizationId) {
      priorityQb.where('project.organizationId = :orgId', { orgId: organizationId });
    }
    const priorityCounts = await priorityQb.groupBy('project.priority').getRawMany();

    const aggregateQb = this.projectRepository
      .createQueryBuilder('project')
      .select('AVG(project.progress)', 'avgProgress')
      .addSelect('SUM(project.budget)', 'totalBudget')
      .addSelect('SUM(project.actualCost)', 'totalActualCost');
    if (organizationId) {
      aggregateQb.where('project.organizationId = :orgId', { orgId: organizationId });
    }
    const aggregates = await aggregateQb.getRawOne();

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((item) => {
      byStatus[item.status] = parseInt(item.count, 10);
    });

    const byPriority: Record<string, number> = {};
    priorityCounts.forEach((item) => {
      byPriority[item.priority] = parseInt(item.count, 10);
    });

    return {
      total,
      byStatus,
      byPriority,
      averageProgress: parseFloat(aggregates?.avgProgress || '0'),
      totalBudget: parseFloat(aggregates?.totalBudget || '0'),
      totalActualCost: parseFloat(aggregates?.totalActualCost || '0'),
    };
  }

  async getOverdueProjects(organizationId?: string): Promise<Project[]> {
    const today = new Date();
    const qb = this.projectRepository
      .createQueryBuilder('project')
      .where('project.endDate < :today', { today })
      .andWhere('project.status NOT IN (:...completedStatuses)', {
        completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      })
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.manager', 'manager');

    if (organizationId) {
      qb.andWhere('project.organizationId = :orgId', { orgId: organizationId });
    }

    return qb.getMany();
  }

  async getUpcomingDeadlines(days: number = 7, organizationId?: string): Promise<Project[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const qb = this.projectRepository
      .createQueryBuilder('project')
      .where('project.endDate BETWEEN :today AND :futureDate', {
        today,
        futureDate,
      })
      .andWhere('project.status NOT IN (:...completedStatuses)', {
        completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      })
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.manager', 'manager');

    if (organizationId) {
      qb.andWhere('project.organizationId = :orgId', { orgId: organizationId });
    }

    return qb.orderBy('project.endDate', 'ASC').getMany();
  }

  /**
   * ヘルススコアを計算する
   */
  calculateHealthScore(project: Project): number {
    let score = 100;

    const today = new Date();
    const endDate = project.endDate ? new Date(project.endDate) : null;
    const startDate = project.startDate ? new Date(project.startDate) : null;

    // 期限超過で減点（-30点）
    if (
      endDate &&
      today > endDate &&
      project.status !== ProjectStatus.COMPLETED &&
      project.status !== ProjectStatus.CANCELLED
    ) {
      score -= 30;
    }

    // 進捗遅れで減点
    if (startDate && endDate && project.progress !== undefined) {
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsed = today.getTime() - startDate.getTime();

      if (totalDuration > 0 && elapsed > 0) {
        const expectedProgress = Math.min(100, (elapsed / totalDuration) * 100);
        const progressGap = expectedProgress - project.progress;

        if (progressGap > 20) {
          score -= Math.min(25, Math.floor(progressGap / 2));
        }
      }
    }

    // 予算超過で減点（-20点）
    if (project.budget && project.actualCost) {
      const budgetRatio = project.actualCost / project.budget;
      if (budgetRatio > 1) {
        score -= Math.min(20, Math.floor((budgetRatio - 1) * 100));
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  async updateHealthScore(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner', 'manager', 'partners', 'createdBy'],
    });

    if (!project) {
      throw ResourceNotFoundException.forProject(id);
    }

    project.healthScore = this.calculateHealthScore(project);
    await this.projectRepository.save(project);
    this.logger.log(`Project health score updated: ${project.name} -> ${project.healthScore}`);
    return project;
  }

  async getProjectTimeline(id: string): Promise<{
    projectId: string;
    projectName: string;
    events: Array<{
      type: string;
      description: string;
      timestamp: Date;
    }>;
  }> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner', 'manager', 'partners', 'createdBy'],
    });

    if (!project) {
      throw ResourceNotFoundException.forProject(id);
    }

    const events: Array<{
      type: string;
      description: string;
      timestamp: Date;
    }> = [];

    events.push({
      type: 'created',
      description: `Project "${project.name}" was created`,
      timestamp: project.createdAt,
    });

    if (project.updatedAt.getTime() !== project.createdAt.getTime()) {
      events.push({
        type: 'updated',
        description: `Project "${project.name}" was last updated`,
        timestamp: project.updatedAt,
      });
    }

    if (project.status === ProjectStatus.COMPLETED && project.actualEndDate) {
      events.push({
        type: 'completed',
        description: `Project "${project.name}" was completed`,
        timestamp: project.actualEndDate,
      });
    }

    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      projectId: project.id,
      projectName: project.name,
      events,
    };
  }
}
