import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EscalationRule } from './entities/escalation-rule.entity';
import { EscalationLog } from './entities/escalation-log.entity';
import { Task } from '../task/entities/task.entity';
import { Project } from '../project/entities/project.entity';
import { ProjectStakeholder } from '../project/entities/project-stakeholder.entity';
import { ReminderService } from '../reminder/reminder.service';
import {
  CreateEscalationRuleDto,
  UpdateEscalationRuleDto,
  QueryEscalationRuleDto,
  QueryEscalationLogDto,
  TriggerEscalationCheckDto,
} from './dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import {
  EscalationAction,
  EscalationTriggerType,
  EscalationRuleStatus,
  EscalationLogStatus,
} from './enums/escalation.enum';
import { TaskStatus } from '../task/enums/task-status.enum';
import { ReminderType, ReminderChannel } from '../reminder/enums/reminder-type.enum';

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    @InjectRepository(EscalationRule)
    private escalationRuleRepository: Repository<EscalationRule>,
    @InjectRepository(EscalationLog)
    private escalationLogRepository: Repository<EscalationLog>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectStakeholder)
    private stakeholderRepository: Repository<ProjectStakeholder>,
    private reminderService: ReminderService,
  ) {}

  // ========================
  // Rule CRUD Operations
  // ========================

  async createRule(
    createRuleDto: CreateEscalationRuleDto,
    createdById: string,
  ): Promise<EscalationRule> {
    const rule = this.escalationRuleRepository.create({
      ...createRuleDto,
      createdById,
    });

    await this.escalationRuleRepository.save(rule);
    this.logger.log(`Escalation rule created: ${rule.name} (${rule.id})`);

    return this.findRuleById(rule.id);
  }

  async findAllRules(queryDto: QueryEscalationRuleDto): Promise<PaginatedResponseDto<EscalationRule>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'priority',
      sortOrder = 'ASC',
      projectId,
      triggerType,
      action,
      status,
    } = queryDto;

    const queryBuilder = this.escalationRuleRepository
      .createQueryBuilder('rule')
      .leftJoinAndSelect('rule.project', 'project')
      .leftJoinAndSelect('rule.escalateToUser', 'escalateToUser')
      .leftJoinAndSelect('rule.createdBy', 'createdBy');

    if (projectId) {
      queryBuilder.andWhere('(rule.projectId = :projectId OR rule.projectId IS NULL)', { projectId });
    }

    if (triggerType) {
      queryBuilder.andWhere('rule.triggerType = :triggerType', { triggerType });
    }

    if (action) {
      queryBuilder.andWhere('rule.action = :action', { action });
    }

    if (status) {
      queryBuilder.andWhere('rule.status = :status', { status });
    }

    queryBuilder.orderBy(`rule.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findRuleById(id: string): Promise<EscalationRule> {
    const rule = await this.escalationRuleRepository.findOne({
      where: { id },
      relations: ['project', 'escalateToUser', 'createdBy'],
    });

    if (!rule) {
      throw new NotFoundException(`Escalation rule with ID "${id}" not found`);
    }

    return rule;
  }

  async updateRule(id: string, updateRuleDto: UpdateEscalationRuleDto): Promise<EscalationRule> {
    const rule = await this.findRuleById(id);
    Object.assign(rule, updateRuleDto);
    await this.escalationRuleRepository.save(rule);

    this.logger.log(`Escalation rule updated: ${rule.name} (${rule.id})`);

    return this.findRuleById(id);
  }

  async deleteRule(id: string): Promise<void> {
    const rule = await this.findRuleById(id);
    await this.escalationRuleRepository.remove(rule);
    this.logger.log(`Escalation rule deleted: ${rule.name} (${id})`);
  }

  // ========================
  // Log Operations
  // ========================

  async findAllLogs(queryDto: QueryEscalationLogDto): Promise<PaginatedResponseDto<EscalationLog>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      projectId,
      taskId,
      ruleId,
      action,
      status,
      dateFrom,
      dateTo,
    } = queryDto;

    const queryBuilder = this.escalationLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.rule', 'rule')
      .leftJoinAndSelect('log.task', 'task')
      .leftJoinAndSelect('log.project', 'project')
      .leftJoinAndSelect('log.escalatedToUser', 'escalatedToUser');

    if (projectId) {
      queryBuilder.andWhere('log.projectId = :projectId', { projectId });
    }

    if (taskId) {
      queryBuilder.andWhere('log.taskId = :taskId', { taskId });
    }

    if (ruleId) {
      queryBuilder.andWhere('log.ruleId = :ruleId', { ruleId });
    }

    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }

    if (status) {
      queryBuilder.andWhere('log.status = :status', { status });
    }

    if (dateFrom) {
      queryBuilder.andWhere('log.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('log.createdAt <= :dateTo', { dateTo });
    }

    queryBuilder.orderBy(`log.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async getEscalationHistory(projectId: string): Promise<EscalationLog[]> {
    return this.escalationLogRepository.find({
      where: { projectId },
      relations: ['rule', 'task', 'escalatedToUser'],
      order: { createdAt: 'DESC' },
    });
  }

  // ========================
  // Core Escalation Logic
  // ========================

  async checkAndTriggerEscalation(task: Task): Promise<EscalationLog[]> {
    const logs: EscalationLog[] = [];

    if (!task.dueDate) {
      return logs;
    }

    // Skip completed or cancelled tasks
    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) {
      return logs;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Get applicable rules (project-specific and global)
    const rules = await this.escalationRuleRepository.find({
      where: [
        { projectId: task.projectId, status: EscalationRuleStatus.ACTIVE },
        { projectId: IsNull(), status: EscalationRuleStatus.ACTIVE },
      ],
      order: { priority: 'ASC' },
    });

    for (const rule of rules) {
      const shouldTrigger = this.evaluateRule(rule, daysDiff, task);

      if (shouldTrigger) {
        // Check if this rule was already triggered for this task today
        const existingLog = await this.escalationLogRepository.findOne({
          where: {
            ruleId: rule.id,
            taskId: task.id,
            createdAt: MoreThanOrEqual(today),
          },
        });

        if (!existingLog) {
          const log = await this.executeEscalation(rule, task);
          logs.push(log);
        }
      }
    }

    return logs;
  }

  private evaluateRule(rule: EscalationRule, daysDiff: number, task: Task): boolean {
    switch (rule.triggerType) {
      case EscalationTriggerType.DAYS_BEFORE_DUE:
        // Trigger when task is due within X days (daysDiff > 0 means before due)
        return daysDiff >= 0 && daysDiff <= rule.triggerValue;

      case EscalationTriggerType.DAYS_AFTER_DUE:
        // Trigger when task is overdue by X days (daysDiff < 0 means after due)
        return daysDiff < 0 && Math.abs(daysDiff) >= rule.triggerValue;

      case EscalationTriggerType.PROGRESS_BELOW:
        // Trigger when progress is below threshold and task is close to or past due
        return task.progress < rule.triggerValue && daysDiff <= 3;

      default:
        return false;
    }
  }

  async executeEscalation(rule: EscalationRule, task: Task): Promise<EscalationLog> {
    const log = this.escalationLogRepository.create({
      ruleId: rule.id,
      taskId: task.id,
      projectId: task.projectId,
      action: rule.action,
      status: EscalationLogStatus.PENDING,
    });

    try {
      switch (rule.action) {
        case EscalationAction.NOTIFY_OWNER:
          await this.notifyOwner(task, rule, log);
          break;

        case EscalationAction.NOTIFY_STAKEHOLDERS:
          await this.notifyStakeholders(task, rule, log);
          break;

        case EscalationAction.ESCALATE_TO_MANAGER:
          await this.escalateToManager(task, rule, log);
          break;
      }

      log.status = EscalationLogStatus.EXECUTED;
      log.executedAt = new Date();
      this.logger.log(`Escalation executed: Rule ${rule.name} on Task ${task.id}`);
    } catch (error) {
      log.status = EscalationLogStatus.FAILED;
      log.errorMessage = error.message;
      this.logger.error(`Escalation failed: Rule ${rule.name} on Task ${task.id}`, error.stack);
    }

    const savedLog = await this.escalationLogRepository.save(log);
    // Return the saved log directly with relations loaded
    return this.escalationLogRepository.findOne({
      where: { id: savedLog.id },
      relations: ['rule', 'task', 'project', 'escalatedToUser'],
    }) as Promise<EscalationLog>;
  }

  private async notifyOwner(task: Task, rule: EscalationRule, log: EscalationLog): Promise<void> {
    if (!task.assigneeId) {
      throw new Error('Task has no assignee to notify');
    }

    // Create a notification via ReminderService
    await this.reminderService.create(
      {
        title: `Escalation: ${rule.name}`,
        message: this.buildNotificationMessage(rule, task),
        type: ReminderType.TASK_OVERDUE,
        channel: ReminderChannel.IN_APP,
        userId: task.assigneeId,
        taskId: task.id,
        projectId: task.projectId,
        scheduledAt: new Date().toISOString(),
      },
      'system',
    );

    log.notifiedUsers = [task.assigneeId];
    log.actionDetail = `Notified task owner (${task.assigneeId})`;
  }

  private async notifyStakeholders(
    task: Task,
    rule: EscalationRule,
    log: EscalationLog,
  ): Promise<void> {
    if (!task.projectId) {
      throw new Error('Task has no project, cannot notify stakeholders');
    }

    // Get project stakeholders
    const stakeholders = await this.stakeholderRepository.find({
      where: { projectId: task.projectId },
      relations: ['partner'],
    });

    // Get project for manager info
    const project = await this.projectRepository.findOne({
      where: { id: task.projectId },
      relations: ['owner', 'manager'],
    });

    const notifiedUsers: string[] = [];

    // Notify project owner
    if (project?.ownerId) {
      await this.reminderService.create(
        {
          title: `Escalation: ${rule.name}`,
          message: this.buildNotificationMessage(rule, task),
          type: ReminderType.TASK_OVERDUE,
          channel: ReminderChannel.IN_APP,
          userId: project.ownerId,
          taskId: task.id,
          projectId: task.projectId,
          scheduledAt: new Date().toISOString(),
        },
        'system',
      );
      notifiedUsers.push(project.ownerId);
    }

    // Notify project manager if different from owner
    if (project?.managerId && project.managerId !== project.ownerId) {
      await this.reminderService.create(
        {
          title: `Escalation: ${rule.name}`,
          message: this.buildNotificationMessage(rule, task),
          type: ReminderType.TASK_OVERDUE,
          channel: ReminderChannel.IN_APP,
          userId: project.managerId,
          taskId: task.id,
          projectId: task.projectId,
          scheduledAt: new Date().toISOString(),
        },
        'system',
      );
      notifiedUsers.push(project.managerId);
    }

    log.notifiedUsers = notifiedUsers;
    log.actionDetail = `Notified ${notifiedUsers.length} stakeholder(s)`;
  }

  private async escalateToManager(
    task: Task,
    rule: EscalationRule,
    log: EscalationLog,
  ): Promise<void> {
    let managerId: string | undefined = rule.escalateToUserId;

    // If no specific manager in rule, try to get project manager
    if (!managerId && task.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: task.projectId },
      });
      managerId = project?.managerId ?? project?.ownerId;
    }

    if (!managerId) {
      throw new Error('No manager found to escalate to');
    }

    await this.reminderService.create(
      {
        title: `ESCALATION: ${rule.name}`,
        message: this.buildNotificationMessage(rule, task, true),
        type: ReminderType.TASK_OVERDUE,
        channel: ReminderChannel.BOTH,
        userId: managerId,
        taskId: task.id,
        projectId: task.projectId,
        scheduledAt: new Date().toISOString(),
        metadata: {
          escalation: true,
          ruleId: rule.id,
          priority: 'high',
        },
      },
      'system',
    );

    log.escalatedToUserId = managerId;
    log.notifiedUsers = [managerId];
    log.actionDetail = `Escalated to manager (${managerId})`;
  }

  private buildNotificationMessage(
    rule: EscalationRule,
    task: Task,
    isEscalation: boolean = false,
  ): string {
    const prefix = isEscalation ? '[ESCALATION] ' : '';
    const dueInfo = task.dueDate
      ? `Due: ${new Date(task.dueDate).toLocaleDateString()}`
      : 'No due date';

    return `${prefix}Task "${task.title}" requires attention.\n\n` +
      `Rule: ${rule.name}\n` +
      `${dueInfo}\n` +
      `Progress: ${task.progress}%\n` +
      `Status: ${task.status}`;
  }

  async logEscalation(
    rule: EscalationRule,
    task: Task,
    action: EscalationAction,
  ): Promise<EscalationLog | null> {
    // This method returns the latest log for the rule/task combination
    const log = await this.escalationLogRepository.findOne({
      where: {
        ruleId: rule.id,
        taskId: task.id,
        action,
      },
      order: { createdAt: 'DESC' },
      relations: ['rule', 'task', 'project', 'escalatedToUser'],
    });

    return log;
  }

  // ========================
  // Scheduled Tasks
  // ========================

  @Cron(CronExpression.EVERY_HOUR)
  async runScheduledEscalationCheck(): Promise<void> {
    this.logger.log('Running scheduled escalation check...');
    await this.triggerEscalationCheck({});
    this.logger.log('Scheduled escalation check completed');
  }

  async triggerEscalationCheck(dto: TriggerEscalationCheckDto): Promise<{
    tasksChecked: number;
    escalationsTriggered: number;
    logs: EscalationLog[];
  }> {
    const today = new Date();
    const checkRangeStart = new Date(today);
    checkRangeStart.setDate(checkRangeStart.getDate() - 30); // Check tasks due within last 30 days

    const checkRangeEnd = new Date(today);
    checkRangeEnd.setDate(checkRangeEnd.getDate() + 7); // And tasks due within next 7 days

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

    if (dto.projectId) {
      queryBuilder.andWhere('task.projectId = :projectId', { projectId: dto.projectId });
    }

    if (dto.taskId) {
      queryBuilder.andWhere('task.id = :taskId', { taskId: dto.taskId });
    }

    const tasks = await queryBuilder.getMany();
    const allLogs: EscalationLog[] = [];

    for (const task of tasks) {
      const logs = await this.checkAndTriggerEscalation(task);
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

  async getEscalationStatistics(): Promise<{
    totalRules: number;
    activeRules: number;
    totalLogs: number;
    logsByStatus: Record<string, number>;
    logsByAction: Record<string, number>;
    recentEscalations: number;
  }> {
    const totalRules = await this.escalationRuleRepository.count();
    const activeRules = await this.escalationRuleRepository.count({
      where: { status: EscalationRuleStatus.ACTIVE },
    });
    const totalLogs = await this.escalationLogRepository.count();

    const statusCounts = await this.escalationLogRepository
      .createQueryBuilder('log')
      .select('log.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.status')
      .getRawMany();

    const actionCounts = await this.escalationLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.action')
      .getRawMany();

    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const recentEscalations = await this.escalationLogRepository.count({
      where: {
        createdAt: MoreThanOrEqual(last24Hours),
      },
    });

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
