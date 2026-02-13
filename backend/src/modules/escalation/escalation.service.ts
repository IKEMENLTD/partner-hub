import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EscalationRule } from './entities/escalation-rule.entity';
import { EscalationLog } from './entities/escalation-log.entity';
import { Task } from '../task/entities/task.entity';
import {
  CreateEscalationRuleDto,
  UpdateEscalationRuleDto,
  QueryEscalationRuleDto,
  QueryEscalationLogDto,
  TriggerEscalationCheckDto,
} from './dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { EscalationAction, EscalationRuleStatus } from './enums/escalation.enum';
import { TaskStatus } from '../task/enums/task-status.enum';
import { EscalationRuleService } from './services/escalation-rule.service';
import { EscalationExecutorService } from './services/escalation-executor.service';

/**
 * EscalationService - エスカレーションルールの管理と実行
 *
 * 依存関係アーキテクチャ:
 *   EscalationService → ReminderService → NotificationService
 */
@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    @InjectRepository(EscalationLog)
    private escalationLogRepository: Repository<EscalationLog>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @Inject(forwardRef(() => EscalationRuleService))
    private ruleService: EscalationRuleService,
    @Inject(forwardRef(() => EscalationExecutorService))
    private executorService: EscalationExecutorService,
  ) {}

  // ========================
  // Rule CRUD Operations (Delegated)
  // ========================

  async createRule(
    createRuleDto: CreateEscalationRuleDto,
    createdById: string,
    organizationId?: string,
  ): Promise<EscalationRule> {
    return this.ruleService.createRule(createRuleDto, createdById, organizationId);
  }

  async findAllRules(
    queryDto: QueryEscalationRuleDto,
    organizationId?: string,
  ): Promise<PaginatedResponseDto<EscalationRule>> {
    return this.ruleService.findAllRules(queryDto, organizationId);
  }

  async findRuleById(id: string, organizationId?: string): Promise<EscalationRule> {
    return this.ruleService.findRuleById(id, organizationId);
  }

  async updateRule(id: string, updateRuleDto: UpdateEscalationRuleDto, organizationId?: string): Promise<EscalationRule> {
    return this.ruleService.updateRule(id, updateRuleDto, organizationId);
  }

  async deleteRule(id: string, organizationId?: string): Promise<void> {
    return this.ruleService.deleteRule(id, organizationId);
  }

  // ========================
  // Log Operations (Delegated)
  // ========================

  async findAllLogs(queryDto: QueryEscalationLogDto, organizationId?: string): Promise<PaginatedResponseDto<EscalationLog>> {
    return this.ruleService.findAllLogs(queryDto, organizationId);
  }

  async getEscalationHistory(projectId: string, organizationId?: string): Promise<EscalationLog[]> {
    return this.ruleService.getEscalationHistory(projectId, organizationId);
  }

  // ========================
  // Core Escalation Logic (Delegated)
  // ========================

  async checkAndTriggerEscalation(task: Task, organizationId?: string): Promise<EscalationLog[]> {
    return this.executorService.checkAndTriggerEscalation(task, organizationId);
  }

  async executeEscalation(rule: EscalationRule, task: Task): Promise<EscalationLog> {
    return this.executorService.executeEscalation(rule, task);
  }

  async logEscalation(
    rule: EscalationRule,
    task: Task,
    action: EscalationAction,
  ): Promise<EscalationLog | null> {
    return this.executorService.logEscalation(rule, task, action);
  }

  // ========================
  // Scheduled Tasks
  // ========================

  @Cron(CronExpression.EVERY_HOUR)
  async runScheduledEscalationCheck(): Promise<void> {
    try {
      this.logger.log('Running scheduled escalation check...');
      await this.triggerEscalationCheck({});
      this.logger.log('Scheduled escalation check completed');
    } catch (error) {
      this.logger.error(`Failed to run scheduled escalation check: ${error.message}`, error.stack);
    }
  }

  async triggerEscalationCheck(dto: TriggerEscalationCheckDto, organizationId?: string): Promise<{
    tasksChecked: number;
    escalationsTriggered: number;
    logs: EscalationLog[];
  }> {
    const today = new Date();
    const checkRangeStart = new Date(today);
    checkRangeStart.setDate(checkRangeStart.getDate() - 30);

    const checkRangeEnd = new Date(today);
    checkRangeEnd.setDate(checkRangeEnd.getDate() + 7);

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .andWhere('task.dueDate IS NOT NULL')
      .andWhere('task.dueDate BETWEEN :start AND :end', {
        start: checkRangeStart,
        end: checkRangeEnd,
      });

    if (organizationId) {
      queryBuilder.andWhere('project.organizationId = :organizationId', { organizationId });
    }

    if (dto.projectId) {
      queryBuilder.andWhere('task.projectId = :projectId', { projectId: dto.projectId });
    }

    if (dto.taskId) {
      queryBuilder.andWhere('task.id = :taskId', { taskId: dto.taskId });
    }

    const tasks = await queryBuilder.getMany();
    const allLogs: EscalationLog[] = [];

    for (const task of tasks) {
      const taskOrgId = organizationId || task.project?.organizationId;
      const logs = await this.executorService.checkAndTriggerEscalation(task, taskOrgId);
      allLogs.push(...logs);
    }

    return {
      tasksChecked: tasks.length,
      escalationsTriggered: allLogs.length,
      logs: allLogs,
    };
  }

  // ========================
  // Statistics
  // ========================

  async getEscalationStatistics(organizationId?: string): Promise<{
    totalRules: number;
    activeRules: number;
    totalLogs: number;
    logsByStatus: Record<string, number>;
    logsByAction: Record<string, number>;
    recentEscalations: number;
  }> {
    const [totalRules, activeRules] = await Promise.all([
      this.ruleService.findAllRules({ page: 1, limit: 1 }, organizationId).then((r) => r.pagination.total),
      this.ruleService
        .findAllRules({ page: 1, limit: 1, status: EscalationRuleStatus.ACTIVE }, organizationId)
        .then((r) => r.pagination.total),
    ]);

    // For logs, filter through project.organizationId
    const totalLogsQb = this.escalationLogRepository.createQueryBuilder('log');
    if (organizationId) {
      totalLogsQb.innerJoin('log.project', 'logProject')
        .where('logProject.organizationId = :organizationId', { organizationId });
    }
    const totalLogs = await totalLogsQb.getCount();

    const statusQb = this.escalationLogRepository
      .createQueryBuilder('log')
      .select('log.status', 'status')
      .addSelect('COUNT(*)', 'count');
    if (organizationId) {
      statusQb.innerJoin('log.project', 'sProject')
        .where('sProject.organizationId = :organizationId', { organizationId });
    }
    const statusCounts = await statusQb.groupBy('log.status').getRawMany();

    const actionQb = this.escalationLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count');
    if (organizationId) {
      actionQb.innerJoin('log.project', 'aProject')
        .where('aProject.organizationId = :organizationId', { organizationId });
    }
    const actionCounts = await actionQb.groupBy('log.action').getRawMany();

    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const recentQb = this.escalationLogRepository.createQueryBuilder('log')
      .where('log.createdAt >= :last24Hours', { last24Hours });
    if (organizationId) {
      recentQb.innerJoin('log.project', 'rProject')
        .andWhere('rProject.organizationId = :organizationId', { organizationId });
    }
    const recentEscalations = await recentQb.getCount();

    const logsByStatus: Record<string, number> = {};
    statusCounts.forEach((item) => {
      logsByStatus[item.status] = parseInt(item.count, 10);
    });

    const logsByAction: Record<string, number> = {};
    actionCounts.forEach((item) => {
      logsByAction[item.action] = parseInt(item.count, 10);
    });

    return {
      totalRules,
      activeRules,
      totalLogs,
      logsByStatus,
      logsByAction,
      recentEscalations,
    };
  }
}
