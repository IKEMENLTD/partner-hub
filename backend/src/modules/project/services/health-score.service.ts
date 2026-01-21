import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThan, Not, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Project } from '../entities/project.entity';
import { ProjectStakeholder } from '../entities/project-stakeholder.entity';
import { Task } from '../../task/entities/task.entity';
import { TaskStatus } from '../../task/enums/task-status.enum';
import { ProjectStatus } from '../enums/project-status.enum';

/**
 * Health Score calculation breakdown:
 * - Task completion rate: 40 points (completed / total * 40)
 * - On-time completion rate: 30 points (on-time completed / completed * 30)
 * - Overdue tasks penalty: -20 points max (-5 per overdue task)
 * - Activity: 10 points (task updates in last 7 days)
 * - Stakeholder coverage: 20 points
 *   - Tier1 exists: +5, Tier2 exists: +5, Tier3 exists: +5
 *   - Tier1 has 2+ members: +5
 */
export interface HealthScoreBreakdown {
  taskCompletionScore: number;
  onTimeCompletionScore: number;
  overdueTasksPenalty: number;
  activityScore: number;
  stakeholderScore: number;
  totalScore: number;
  details: {
    totalTasks: number;
    completedTasks: number;
    onTimeCompletedTasks: number;
    overdueTasks: number;
    hasRecentActivity: boolean;
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
  };
}

@Injectable()
export class HealthScoreService {
  private readonly logger = new Logger(HealthScoreService.name);

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectStakeholder)
    private stakeholderRepository: Repository<ProjectStakeholder>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  /**
   * Calculate health score for a specific project
   * @param projectId Project ID to calculate score for
   * @returns Health score breakdown with total score (0-100)
   */
  async calculateHealthScore(projectId: string): Promise<HealthScoreBreakdown> {
    // Verify project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found`);
    }

    // Skip calculation for completed or cancelled projects
    if (project.status === ProjectStatus.COMPLETED || project.status === ProjectStatus.CANCELLED) {
      return {
        taskCompletionScore: 40,
        onTimeCompletionScore: 30,
        overdueTasksPenalty: 0,
        activityScore: 0,
        stakeholderScore: 20,
        totalScore: project.healthScore,
        details: {
          totalTasks: 0,
          completedTasks: 0,
          onTimeCompletedTasks: 0,
          overdueTasks: 0,
          hasRecentActivity: false,
          tier1Count: 0,
          tier2Count: 0,
          tier3Count: 0,
        },
      };
    }

    // Get all tasks for the project
    const tasks = await this.taskRepository.find({
      where: { projectId },
    });

    // Calculate task completion score (40 points max)
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (t) => t.status === TaskStatus.COMPLETED,
    ).length;
    const taskCompletionScore =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 40) : 40;

    // Calculate on-time completion score (30 points max)
    const completedTasksWithDue = tasks.filter(
      (t) => t.status === TaskStatus.COMPLETED && t.dueDate,
    );
    const onTimeCompletedTasks = completedTasksWithDue.filter((t) => {
      const dueDate = new Date(t.dueDate);
      const completedAt = t.completedAt ? new Date(t.completedAt) : new Date();
      return completedAt <= dueDate;
    }).length;

    const onTimeCompletionScore =
      completedTasksWithDue.length > 0
        ? Math.round((onTimeCompletedTasks / completedTasksWithDue.length) * 30)
        : 30;

    // Calculate overdue tasks penalty (-20 points max, -5 per task)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = tasks.filter((t) => {
      if (!t.dueDate) return false;
      if (t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED) return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;

    const overdueTasksPenalty = Math.min(overdueTasks * 5, 20);

    // Calculate activity score (10 points if activity in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentTasks = tasks.filter((t) => {
      const updatedAt = new Date(t.updatedAt);
      return updatedAt >= sevenDaysAgo;
    });

    const hasRecentActivity = recentTasks.length > 0;
    const activityScore = hasRecentActivity ? 10 : 0;

    // Calculate stakeholder score (20 points max)
    const stakeholders = await this.stakeholderRepository.find({
      where: { projectId },
    });

    const tier1Count = stakeholders.filter((s) => s.tier === 1).length;
    const tier2Count = stakeholders.filter((s) => s.tier === 2).length;
    const tier3Count = stakeholders.filter((s) => s.tier === 3).length;

    let stakeholderScore = 0;
    if (tier1Count > 0) stakeholderScore += 5;
    if (tier2Count > 0) stakeholderScore += 5;
    if (tier3Count > 0) stakeholderScore += 5;
    if (tier1Count >= 2) stakeholderScore += 5;

    // Calculate total score (0-100)
    const totalScore = Math.max(
      0,
      Math.min(
        100,
        taskCompletionScore +
          onTimeCompletionScore -
          overdueTasksPenalty +
          activityScore +
          stakeholderScore,
      ),
    );

    return {
      taskCompletionScore,
      onTimeCompletionScore,
      overdueTasksPenalty,
      activityScore,
      stakeholderScore,
      totalScore,
      details: {
        totalTasks,
        completedTasks,
        onTimeCompletedTasks,
        overdueTasks,
        hasRecentActivity,
        tier1Count,
        tier2Count,
        tier3Count,
      },
    };
  }

  /**
   * Update health score for a specific project and save to database
   * @param projectId Project ID to update
   * @returns Updated project with new health score
   */
  async updateProjectHealthScore(projectId: string): Promise<Project> {
    const breakdown = await this.calculateHealthScore(projectId);

    await this.projectRepository.update(projectId, {
      healthScore: breakdown.totalScore,
    });

    this.logger.log(
      `Health score updated for project ${projectId}: ${breakdown.totalScore}`,
    );

    return this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['owner', 'manager', 'partners', 'createdBy'],
    }) as Promise<Project>;
  }

  /**
   * Update health scores for all active projects
   * @returns Summary of updated projects
   */
  async updateAllProjectHealthScores(): Promise<{
    totalProjects: number;
    updatedProjects: number;
    errors: string[];
  }> {
    // Get all active projects (not completed or cancelled)
    const projects = await this.projectRepository.find({
      where: {
        status: Not(In([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED])),
      },
    });

    const errors: string[] = [];
    let updatedCount = 0;

    for (const project of projects) {
      try {
        await this.updateProjectHealthScore(project.id);
        updatedCount++;
      } catch (error) {
        const errorMessage = `Failed to update health score for project ${project.id}: ${error.message}`;
        this.logger.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    this.logger.log(
      `Health score batch update completed: ${updatedCount}/${projects.length} projects updated`,
    );

    return {
      totalProjects: projects.length,
      updatedProjects: updatedCount,
      errors,
    };
  }

  /**
   * Cron job to update all project health scores daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduledHealthScoreUpdate(): Promise<void> {
    this.logger.log('Running scheduled health score update...');
    const result = await this.updateAllProjectHealthScores();
    this.logger.log(
      `Scheduled health score update completed: ${result.updatedProjects}/${result.totalProjects} projects updated`,
    );
    if (result.errors.length > 0) {
      this.logger.warn(`Errors during update: ${result.errors.length}`);
    }
  }

  /**
   * Trigger health score recalculation when a task is modified
   * Should be called from TaskService on create/update/delete
   * @param projectId Project ID of the affected task
   */
  async onTaskChanged(projectId: string): Promise<void> {
    if (!projectId) {
      return;
    }

    try {
      await this.updateProjectHealthScore(projectId);
      this.logger.debug(
        `Health score recalculated for project ${projectId} due to task change`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to recalculate health score for project ${projectId}: ${error.message}`,
      );
    }
  }

  /**
   * Get health score statistics across all projects
   */
  async getHealthScoreStatistics(): Promise<{
    averageScore: number;
    scoreDistribution: {
      excellent: number; // 80-100
      good: number; // 60-79
      fair: number; // 40-59
      poor: number; // 0-39
    };
    projectsAtRisk: number; // score < 50
  }> {
    const projects = await this.projectRepository.find({
      where: {
        status: Not(In([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED])),
      },
      select: ['id', 'healthScore'],
    });

    if (projects.length === 0) {
      return {
        averageScore: 0,
        scoreDistribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0,
        },
        projectsAtRisk: 0,
      };
    }

    const scores = projects.map((p) => p.healthScore);
    const averageScore = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length,
    );

    const scoreDistribution = {
      excellent: scores.filter((s) => s >= 80).length,
      good: scores.filter((s) => s >= 60 && s < 80).length,
      fair: scores.filter((s) => s >= 40 && s < 60).length,
      poor: scores.filter((s) => s < 40).length,
    };

    const projectsAtRisk = scores.filter((s) => s < 50).length;

    return {
      averageScore,
      scoreDistribution,
      projectsAtRisk,
    };
  }
}
