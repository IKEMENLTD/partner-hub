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
 * Health Score calculation formula:
 * - OnTimeRate = (完了時期限内タスク数 / 完了タスク総数) * 100
 * - CompletionRate = (完了タスク数 / 全タスク数) * 100
 * - BudgetHealth = MIN(100, (予算 - 実績費用) / 予算 * 100)
 * - HealthScore = (50 * OnTimeRate + 30 * CompletionRate + 20 * BudgetHealth) / 100
 *
 * Weight breakdown:
 * - OnTimeRate: 50% (期限遵守率)
 * - CompletionRate: 30% (完了率)
 * - BudgetHealth: 20% (予算健全性)
 */
export interface HealthScoreBreakdown {
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
   * Calculate OnTimeRate: 完了タスクのうち期限内に完了した割合
   * @param completedOnTimeTasks 期限内完了タスク数
   * @param totalCompletedTasks 完了タスク総数
   * @returns OnTimeRate (0-100)
   */
  private calculateOnTimeRate(completedOnTimeTasks: number, totalCompletedTasks: number): number {
    if (totalCompletedTasks === 0) {
      return 100; // タスクがない場合は100%とする
    }
    return (completedOnTimeTasks / totalCompletedTasks) * 100;
  }

  /**
   * Calculate CompletionRate: 全タスクのうち完了したタスクの割合
   * @param completedTasks 完了タスク数
   * @param totalTasks 全タスク数
   * @returns CompletionRate (0-100)
   */
  private calculateCompletionRate(completedTasks: number, totalTasks: number): number {
    if (totalTasks === 0) {
      return 100; // タスクがない場合は100%とする
    }
    return (completedTasks / totalTasks) * 100;
  }

  /**
   * Calculate BudgetHealth: 予算の健全性
   * BudgetHealth = MIN(100, (予算 - 実績費用) / 予算 * 100)
   * @param budget 予算
   * @param actualCost 実績費用
   * @returns BudgetHealth (0-100)
   */
  private calculateBudgetHealth(budget: number, actualCost: number): number {
    if (!budget || budget <= 0) {
      return 100; // 予算が設定されていない場合は100%とする
    }
    const remaining = budget - actualCost;
    const health = (remaining / budget) * 100;
    return Math.min(100, Math.max(0, health));
  }

  /**
   * Calculate final HealthScore using weighted formula:
   * HealthScore = (50 * OnTimeRate + 30 * CompletionRate + 20 * BudgetHealth) / 100
   * @param onTimeRate 期限遵守率 (0-100)
   * @param completionRate 完了率 (0-100)
   * @param budgetHealth 予算健全性 (0-100)
   * @returns HealthScore (0-100)
   */
  private calculateWeightedHealthScore(
    onTimeRate: number,
    completionRate: number,
    budgetHealth: number,
  ): number {
    const score = (50 * onTimeRate + 30 * completionRate + 20 * budgetHealth) / 100;
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Calculate health score for a specific project
   * Formula:
   * - OnTimeRate = (完了時期限内タスク数 / 完了タスク総数) * 100
   * - CompletionRate = (完了タスク数 / 全タスク数) * 100
   * - BudgetHealth = MIN(100, (予算 - 実績費用) / 予算 * 100)
   * - HealthScore = (50 * OnTimeRate + 30 * CompletionRate + 20 * BudgetHealth) / 100
   *
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

    // Skip calculation for completed or cancelled projects - return current score
    if (project.status === ProjectStatus.COMPLETED || project.status === ProjectStatus.CANCELLED) {
      return {
        onTimeRate: 100,
        completionRate: 100,
        budgetHealth: 100,
        totalScore: project.healthScore,
        details: {
          totalTasks: 0,
          completedTasks: 0,
          onTimeCompletedTasks: 0,
          budget: Number(project.budget) || 0,
          actualCost: Number(project.actualCost) || 0,
        },
      };
    }

    // Get all tasks for the project
    const tasks = await this.taskRepository.find({
      where: { projectId },
    });

    // Count total tasks and completed tasks
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;

    // Count on-time completed tasks (completed before or on due date)
    const onTimeCompletedTasks = tasks.filter((t) => {
      if (t.status !== TaskStatus.COMPLETED) return false;
      if (!t.dueDate) return true; // No due date = always on time
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(23, 59, 59, 999); // End of due date
      const completedAt = t.completedAt ? new Date(t.completedAt) : new Date();
      return completedAt <= dueDate;
    }).length;

    // Calculate rates
    const onTimeRate = this.calculateOnTimeRate(onTimeCompletedTasks, completedTasks);
    const completionRate = this.calculateCompletionRate(completedTasks, totalTasks);
    const budgetHealth = this.calculateBudgetHealth(
      Number(project.budget) || 0,
      Number(project.actualCost) || 0,
    );

    // Calculate final weighted score
    const totalScore = this.calculateWeightedHealthScore(onTimeRate, completionRate, budgetHealth);

    this.logger.debug(
      `Health score calculated for project ${projectId}: ` +
        `OnTimeRate=${onTimeRate.toFixed(1)}%, CompletionRate=${completionRate.toFixed(1)}%, ` +
        `BudgetHealth=${budgetHealth.toFixed(1)}%, Total=${totalScore}`,
    );

    return {
      onTimeRate: Math.round(onTimeRate * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      budgetHealth: Math.round(budgetHealth * 100) / 100,
      totalScore,
      details: {
        totalTasks,
        completedTasks,
        onTimeCompletedTasks,
        budget: Number(project.budget) || 0,
        actualCost: Number(project.actualCost) || 0,
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

    this.logger.log(`Health score updated for project ${projectId}: ${breakdown.totalScore}`);

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
      this.logger.debug(`Health score recalculated for project ${projectId} due to task change`);
    } catch (error) {
      this.logger.error(
        `Failed to recalculate health score for project ${projectId}: ${error.message}`,
      );
    }
  }

  /**
   * Get health score statistics across all projects
   * Returns comprehensive statistics including:
   * - Average score
   * - Score distribution (excellent/good/fair/poor)
   * - Projects at risk count
   * - Average component scores (onTimeRate, completionRate, budgetHealth)
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
    totalProjects: number;
    averageOnTimeRate: number;
    averageCompletionRate: number;
    averageBudgetHealth: number;
  }> {
    const projects = await this.projectRepository.find({
      where: {
        status: Not(In([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED])),
      },
      select: ['id', 'healthScore', 'budget', 'actualCost'],
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
        totalProjects: 0,
        averageOnTimeRate: 0,
        averageCompletionRate: 0,
        averageBudgetHealth: 0,
      };
    }

    // Calculate average scores from individual project breakdowns
    let totalOnTimeRate = 0;
    let totalCompletionRate = 0;
    let totalBudgetHealth = 0;

    for (const project of projects) {
      try {
        const breakdown = await this.calculateHealthScore(project.id);
        totalOnTimeRate += breakdown.onTimeRate;
        totalCompletionRate += breakdown.completionRate;
        totalBudgetHealth += breakdown.budgetHealth;
      } catch (error) {
        this.logger.warn(
          `Failed to calculate breakdown for project ${project.id}: ${error.message}`,
        );
      }
    }

    const scores = projects.map((p) => p.healthScore);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

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
      totalProjects: projects.length,
      averageOnTimeRate: Math.round((totalOnTimeRate / projects.length) * 100) / 100,
      averageCompletionRate: Math.round((totalCompletionRate / projects.length) * 100) / 100,
      averageBudgetHealth: Math.round((totalBudgetHealth / projects.length) * 100) / 100,
    };
  }

  /**
   * Get health score breakdown for all active projects
   * Useful for dashboard display and reporting
   */
  async getAllProjectsHealthScores(): Promise<
    Array<{
      projectId: string;
      projectName: string;
      healthScore: number;
      breakdown: HealthScoreBreakdown;
    }>
  > {
    const projects = await this.projectRepository.find({
      where: {
        status: Not(In([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED])),
      },
      select: ['id', 'name', 'healthScore'],
      order: { healthScore: 'ASC' },
    });

    const results = [];

    for (const project of projects) {
      try {
        const breakdown = await this.calculateHealthScore(project.id);
        results.push({
          projectId: project.id,
          projectName: project.name,
          healthScore: breakdown.totalScore,
          breakdown,
        });
      } catch (error) {
        this.logger.warn(`Failed to get breakdown for project ${project.id}: ${error.message}`);
      }
    }

    return results;
  }
}
