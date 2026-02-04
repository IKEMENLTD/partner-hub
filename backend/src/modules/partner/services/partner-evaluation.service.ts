import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Partner } from '../entities/partner.entity';
import { PartnerEvaluation } from '../entities/partner-evaluation.entity';
import { Task } from '../../task/entities/task.entity';
import { TaskStatus } from '../../task/enums/task-status.enum';
import { CreatePartnerEvaluationDto, QueryPartnerEvaluationDto } from '../dto';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';

export interface AutoMetrics {
  deadlineComplianceRate: number;
  reportSubmissionRate: number;
  averageResponseTime: number;
  totalTasks: number;
  completedOnTime: number;
  totalReportsRequested: number;
  totalReportsSubmitted: number;
}

export interface EvaluationSummary {
  partnerId: string;
  partnerName: string;
  autoMetrics: AutoMetrics;
  manualEvaluation: {
    communication: number;
    deliverableQuality: number;
    responseSpeed: number;
    reliability: number;
    averageManualScore: number;
  };
  overallScore: number;
  evaluationCount: number;
  lastEvaluationDate: Date | null;
}

@Injectable()
export class PartnerEvaluationService {
  private readonly logger = new Logger(PartnerEvaluationService.name);

  constructor(
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(PartnerEvaluation)
    private evaluationRepository: Repository<PartnerEvaluation>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  /**
   * Calculate deadline compliance rate for a partner
   * Formula: (completed on time tasks / total assigned tasks) * 100
   */
  async calculateDeadlineComplianceRate(partnerId: string): Promise<{
    rate: number;
    completedOnTime: number;
    totalTasks: number;
  }> {
    // Get all tasks assigned to this partner
    const allTasks = await this.taskRepository.find({
      where: { partnerId },
    });

    if (allTasks.length === 0) {
      return { rate: 100, completedOnTime: 0, totalTasks: 0 };
    }

    // Count tasks completed on or before deadline
    const completedOnTime = allTasks.filter((task) => {
      if (task.status !== TaskStatus.COMPLETED) return false;
      if (!task.dueDate || !task.completedAt) return true; // No deadline = on time
      return new Date(task.completedAt) <= new Date(task.dueDate);
    }).length;

    const totalCompletedTasks = allTasks.filter(
      (task) => task.status === TaskStatus.COMPLETED,
    ).length;

    const rate = totalCompletedTasks > 0 ? (completedOnTime / totalCompletedTasks) * 100 : 100;

    return {
      rate: Math.round(rate * 100) / 100,
      completedOnTime,
      totalTasks: allTasks.length,
    };
  }

  /**
   * Calculate report submission rate for a partner
   * Formula: (submitted reports / requested reports) * 100
   * Note: This assumes reports are tracked in task metadata
   */
  async calculateReportSubmissionRate(partnerId: string): Promise<{
    rate: number;
    submitted: number;
    requested: number;
  }> {
    // Get all tasks with report requirements for this partner
    const tasksWithReports = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.partnerId = :partnerId', { partnerId })
      .andWhere("task.metadata->>'reportRequired' = 'true'")
      .getMany();

    if (tasksWithReports.length === 0) {
      return { rate: 100, submitted: 0, requested: 0 };
    }

    const submitted = tasksWithReports.filter(
      (task) => task.metadata?.reportSubmitted === true,
    ).length;

    const rate = (submitted / tasksWithReports.length) * 100;

    return {
      rate: Math.round(rate * 100) / 100,
      submitted,
      requested: tasksWithReports.length,
    };
  }

  /**
   * Calculate average response time for a partner
   * Formula: Average days from task assignment to first update
   */
  async calculateAverageResponseTime(partnerId: string): Promise<{
    averageDays: number;
    taskCount: number;
  }> {
    const tasks = await this.taskRepository.find({
      where: { partnerId },
    });

    if (tasks.length === 0) {
      return { averageDays: 0, taskCount: 0 };
    }

    // Calculate response time for each task (createdAt to first updatedAt)
    const responseTimes = tasks
      .filter((task) => task.updatedAt && task.createdAt)
      .map((task) => {
        const created = new Date(task.createdAt).getTime();
        const updated = new Date(task.updatedAt).getTime();
        return (updated - created) / (1000 * 60 * 60 * 24); // Convert to days
      })
      .filter((days) => days > 0);

    if (responseTimes.length === 0) {
      return { averageDays: 0, taskCount: 0 };
    }

    const averageDays = responseTimes.reduce((sum, days) => sum + days, 0) / responseTimes.length;

    return {
      averageDays: Math.round(averageDays * 100) / 100,
      taskCount: responseTimes.length,
    };
  }

  /**
   * Get all auto-calculated metrics for a partner
   */
  async getAutoMetrics(partnerId: string): Promise<AutoMetrics> {
    await this.validatePartner(partnerId);

    const [deadlineCompliance, reportSubmission, responseTime] = await Promise.all([
      this.calculateDeadlineComplianceRate(partnerId),
      this.calculateReportSubmissionRate(partnerId),
      this.calculateAverageResponseTime(partnerId),
    ]);

    return {
      deadlineComplianceRate: deadlineCompliance.rate,
      reportSubmissionRate: reportSubmission.rate,
      averageResponseTime: responseTime.averageDays,
      totalTasks: deadlineCompliance.totalTasks,
      completedOnTime: deadlineCompliance.completedOnTime,
      totalReportsRequested: reportSubmission.requested,
      totalReportsSubmitted: reportSubmission.submitted,
    };
  }

  /**
   * Create a new manual evaluation
   */
  async createEvaluation(
    partnerId: string,
    evaluatorId: string,
    dto: CreatePartnerEvaluationDto,
  ): Promise<PartnerEvaluation> {
    await this.validatePartner(partnerId);

    const evaluation = this.evaluationRepository.create({
      partnerId,
      evaluatorId,
      communication: dto.communication,
      deliverableQuality: dto.deliverableQuality,
      responseSpeed: dto.responseSpeed,
      reliability: dto.reliability,
      comment: dto.comment,
      evaluationPeriodStart: dto.evaluationPeriodStart
        ? new Date(dto.evaluationPeriodStart)
        : undefined,
      evaluationPeriodEnd: dto.evaluationPeriodEnd ? new Date(dto.evaluationPeriodEnd) : undefined,
    });

    await this.evaluationRepository.save(evaluation);

    // Update partner's overall rating
    await this.updatePartnerRating(partnerId);

    this.logger.log(`Evaluation created for partner ${partnerId} by evaluator ${evaluatorId}`);

    return evaluation;
  }

  /**
   * Get evaluation history for a partner
   */
  async getEvaluationHistory(
    partnerId: string,
    queryDto: QueryPartnerEvaluationDto,
  ): Promise<PaginatedResponseDto<PartnerEvaluation>> {
    await this.validatePartner(partnerId);

    const { page = 1, limit = 10, fromDate, toDate } = queryDto;

    const queryBuilder = this.evaluationRepository
      .createQueryBuilder('evaluation')
      .leftJoinAndSelect('evaluation.evaluator', 'evaluator')
      .where('evaluation.partnerId = :partnerId', { partnerId });

    if (fromDate) {
      queryBuilder.andWhere('evaluation.createdAt >= :fromDate', {
        fromDate: new Date(fromDate),
      });
    }

    if (toDate) {
      queryBuilder.andWhere('evaluation.createdAt <= :toDate', {
        toDate: new Date(toDate),
      });
    }

    queryBuilder.orderBy('evaluation.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Get evaluation summary for a partner
   */
  async getEvaluationSummary(partnerId: string): Promise<EvaluationSummary> {
    const partner = await this.validatePartner(partnerId);

    // Get auto metrics
    const autoMetrics = await this.getAutoMetrics(partnerId);

    // Get manual evaluations
    const evaluations = await this.evaluationRepository.find({
      where: { partnerId },
      order: { createdAt: 'DESC' },
    });

    // Calculate average manual scores
    let manualEvaluation = {
      communication: 0,
      deliverableQuality: 0,
      responseSpeed: 0,
      reliability: 0,
      averageManualScore: 0,
    };

    if (evaluations.length > 0) {
      const totals = evaluations.reduce(
        (acc, e) => ({
          communication: acc.communication + e.communication,
          deliverableQuality: acc.deliverableQuality + e.deliverableQuality,
          responseSpeed: acc.responseSpeed + e.responseSpeed,
          reliability: acc.reliability + e.reliability,
        }),
        { communication: 0, deliverableQuality: 0, responseSpeed: 0, reliability: 0 },
      );

      manualEvaluation = {
        communication: totals.communication / evaluations.length,
        deliverableQuality: totals.deliverableQuality / evaluations.length,
        responseSpeed: totals.responseSpeed / evaluations.length,
        reliability: totals.reliability / evaluations.length,
        averageManualScore: 0,
      };

      manualEvaluation.averageManualScore =
        (manualEvaluation.communication +
          manualEvaluation.deliverableQuality +
          manualEvaluation.responseSpeed +
          manualEvaluation.reliability) /
        4;
    }

    // Calculate overall score
    // Convert auto metrics to 5-point scale for fair comparison
    const autoMetricsAvg =
      (autoMetrics.deadlineComplianceRate / 20 + // 100% -> 5
        autoMetrics.reportSubmissionRate / 20 + // 100% -> 5
        Math.max(0, 5 - autoMetrics.averageResponseTime / 2)) / // Lower response time is better
      3;

    const overallScore = autoMetricsAvg * 0.4 + manualEvaluation.averageManualScore * 0.6;

    return {
      partnerId,
      partnerName: partner.name,
      autoMetrics,
      manualEvaluation: {
        communication: Math.round(manualEvaluation.communication * 100) / 100,
        deliverableQuality: Math.round(manualEvaluation.deliverableQuality * 100) / 100,
        responseSpeed: Math.round(manualEvaluation.responseSpeed * 100) / 100,
        reliability: Math.round(manualEvaluation.reliability * 100) / 100,
        averageManualScore: Math.round(manualEvaluation.averageManualScore * 100) / 100,
      },
      overallScore: Math.round(overallScore * 100) / 100,
      evaluationCount: evaluations.length,
      lastEvaluationDate: evaluations.length > 0 ? evaluations[0].createdAt : null,
    };
  }

  /**
   * Update partner's rating based on evaluations
   */
  private async updatePartnerRating(partnerId: string): Promise<void> {
    const summary = await this.getEvaluationSummary(partnerId);

    await this.partnerRepository.update(partnerId, {
      rating: summary.overallScore,
    });

    this.logger.log(`Partner ${partnerId} rating updated to ${summary.overallScore}`);
  }

  /**
   * Validate that a partner exists
   */
  private async validatePartner(partnerId: string): Promise<Partner> {
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });

    if (!partner) {
      throw ResourceNotFoundException.forPartner(partnerId);
    }

    return partner;
  }
}
