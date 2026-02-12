import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Reminder } from './entities/reminder.entity';
import { Task } from '../task/entities/task.entity';
import { Project } from '../project/entities/project.entity';
import { CreateReminderDto, UpdateReminderDto, QueryReminderDto } from './dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { ReminderStatus, ReminderType, ReminderChannel } from './enums/reminder-type.enum';
import { TaskStatus } from '../task/enums/task-status.enum';
import { ProjectStatus } from '../project/enums/project-status.enum';
import { NotificationService } from '../notification/services/notification.service';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';

// SECURITY FIX: Whitelist of allowed sort columns to prevent SQL injection
const ALLOWED_SORT_COLUMNS = [
  'scheduledAt',
  'createdAt',
  'updatedAt',
  'title',
  'type',
  'status',
  'sentAt',
];

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectRepository(Reminder)
    private reminderRepository: Repository<Reminder>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @Optional()
    private notificationService?: NotificationService,
  ) {}

  async create(createReminderDto: CreateReminderDto, createdById: string | null): Promise<Reminder> {
    const reminder = this.reminderRepository.create({
      ...createReminderDto,
      ...(createdById ? { createdById } : {}),
    });

    await this.reminderRepository.save(reminder);
    this.logger.log(`Reminder created: ${reminder.title} (${reminder.id})`);

    return this.findOne(reminder.id);
  }

  async findAll(queryDto: QueryReminderDto): Promise<PaginatedResponseDto<Reminder>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'scheduledAt',
      sortOrder = 'ASC',
      type,
      status,
      userId,
      taskId,
      projectId,
      scheduledFrom,
      scheduledTo,
      isRead,
    } = queryDto;

    const queryBuilder = this.reminderRepository
      .createQueryBuilder('reminder')
      .leftJoinAndSelect('reminder.user', 'user')
      .leftJoinAndSelect('reminder.task', 'task')
      .leftJoinAndSelect('reminder.project', 'project');

    if (type) {
      queryBuilder.andWhere('reminder.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('reminder.status = :status', { status });
    }

    if (userId) {
      queryBuilder.andWhere('reminder.userId = :userId', { userId });
    }

    if (taskId) {
      queryBuilder.andWhere('reminder.taskId = :taskId', { taskId });
    }

    if (projectId) {
      queryBuilder.andWhere('reminder.projectId = :projectId', { projectId });
    }

    if (scheduledFrom) {
      queryBuilder.andWhere('reminder.scheduledAt >= :scheduledFrom', { scheduledFrom });
    }

    if (scheduledTo) {
      queryBuilder.andWhere('reminder.scheduledAt <= :scheduledTo', { scheduledTo });
    }

    if (isRead !== undefined) {
      queryBuilder.andWhere('reminder.isRead = :isRead', { isRead });
    }

    // SECURITY FIX: Validate sortBy against whitelist to prevent SQL injection
    const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'scheduledAt';
    queryBuilder.orderBy(`reminder.${safeSortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string): Promise<Reminder> {
    const reminder = await this.reminderRepository.findOne({
      where: { id },
      relations: ['user', 'task', 'project', 'createdBy'],
    });

    if (!reminder) {
      throw new ResourceNotFoundException('NOTIFICATION_001', {
        resourceType: 'Reminder',
        resourceId: id,
        userMessage: 'リマインダーが見つかりません',
      });
    }

    return reminder;
  }

  async update(id: string, updateReminderDto: UpdateReminderDto): Promise<Reminder> {
    const reminder = await this.findOne(id);
    Object.assign(reminder, updateReminderDto);
    await this.reminderRepository.save(reminder);

    this.logger.log(`Reminder updated: ${reminder.title} (${reminder.id})`);

    return this.findOne(reminder.id);
  }

  async markAsRead(id: string): Promise<Reminder> {
    const reminder = await this.findOne(id);
    reminder.isRead = true;
    await this.reminderRepository.save(reminder);

    return reminder;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.reminderRepository.update({ userId, isRead: false }, { isRead: true });

    this.logger.log(`All reminders marked as read for user: ${userId}`);
  }

  async cancel(id: string): Promise<Reminder> {
    const reminder = await this.findOne(id);
    reminder.status = ReminderStatus.CANCELLED;
    await this.reminderRepository.save(reminder);

    this.logger.log(`Reminder cancelled: ${reminder.title} (${reminder.id})`);

    return reminder;
  }

  async remove(id: string): Promise<void> {
    const reminder = await this.findOne(id);
    await this.reminderRepository.remove(reminder);
    this.logger.log(`Reminder deleted: ${reminder.title} (${id})`);
  }

  async getUserReminders(userId: string, unreadOnly: boolean = false): Promise<Reminder[]> {
    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    return this.reminderRepository.find({
      where,
      relations: ['task', 'project'],
      order: { scheduledAt: 'DESC' },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.reminderRepository.count({
      where: { userId, isRead: false },
    });
  }

  async getPendingReminders(): Promise<Reminder[]> {
    const now = new Date();
    return this.reminderRepository.find({
      where: {
        status: ReminderStatus.PENDING,
        scheduledAt: LessThanOrEqual(now),
      },
      relations: ['user', 'task', 'project'],
      order: { scheduledAt: 'ASC' },
    });
  }

  // Scheduled task to process pending reminders
  @Cron(CronExpression.EVERY_MINUTE)
  async processReminders(): Promise<void> {
    const pendingReminders = await this.getPendingReminders();

    for (const reminder of pendingReminders) {
      try {
        await this.sendReminder(reminder);
        reminder.status = ReminderStatus.SENT;
        reminder.sentAt = new Date();
        this.logger.log(`Reminder sent: ${reminder.title} to user ${reminder.userId}`);
      } catch (error) {
        reminder.retryCount += 1;
        reminder.errorMessage = error.message;

        if (reminder.retryCount >= 3) {
          reminder.status = ReminderStatus.FAILED;
          this.logger.error(`Reminder failed after 3 retries: ${reminder.id}`);
        }
      }

      await this.reminderRepository.save(reminder);
    }
  }

  // Scheduled task to create task due reminders
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async createTaskDueReminders(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasksDueTomorrow = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.dueDate BETWEEN :today AND :tomorrow', { today, tomorrow })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .getMany();

    // Filter tasks with assignees
    const tasksWithAssignees = tasksDueTomorrow.filter((task) => task.assigneeId);
    if (tasksWithAssignees.length === 0) {
      return;
    }

    const taskIds = tasksWithAssignees.map((t) => t.id);

    // Batch query: Get all existing pending reminders for these tasks in one query
    const existingReminders = await this.reminderRepository.find({
      where: {
        taskId: In(taskIds),
        type: ReminderType.TASK_DUE,
        status: ReminderStatus.PENDING,
      },
      select: ['taskId'],
    });

    const existingTaskIds = new Set(existingReminders.map((r) => r.taskId));

    // Filter tasks that don't have existing reminders
    const tasksNeedingReminders = tasksWithAssignees.filter(
      (task) => !existingTaskIds.has(task.id),
    );

    if (tasksNeedingReminders.length === 0) {
      return;
    }

    // Batch insert: Create all reminders at once
    const remindersToCreate = tasksNeedingReminders.map((task) => ({
      title: `期限間近: ${task.title}`,
      message: `タスク「${task.title}」の期限が明日です。`,
      type: ReminderType.TASK_DUE,
      channel: ReminderChannel.IN_APP,
      userId: task.assigneeId,
      taskId: task.id,
      projectId: task.projectId,
      scheduledAt: new Date(),
    }));

    await this.reminderRepository.save(remindersToCreate);
    this.logger.log(`Task due reminders created for ${remindersToCreate.length} tasks`);
  }

  // Scheduled task to create overdue task reminders
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async createOverdueTaskReminders(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.dueDate < :today', { today })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .getMany();

    // Filter tasks with assignees
    const tasksWithAssignees = overdueTasks.filter((task) => task.assigneeId);
    if (tasksWithAssignees.length === 0) {
      return;
    }

    const taskIds = tasksWithAssignees.map((t) => t.id);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Batch query: Get all existing overdue reminders created before today for these tasks
    const existingReminders = await this.reminderRepository.find({
      where: {
        taskId: In(taskIds),
        type: ReminderType.TASK_OVERDUE,
        createdAt: LessThanOrEqual(todayStart),
      },
      select: ['taskId'],
    });

    const existingTaskIds = new Set(existingReminders.map((r) => r.taskId));

    // Filter tasks that don't have existing reminders
    const tasksNeedingReminders = tasksWithAssignees.filter(
      (task) => !existingTaskIds.has(task.id),
    );

    if (tasksNeedingReminders.length === 0) {
      return;
    }

    // Batch insert: Create all reminders at once
    const remindersToCreate = tasksNeedingReminders.map((task) => ({
      title: `期限超過: ${task.title}`,
      message: `タスク「${task.title}」が期限を過ぎています。状況を更新してください。`,
      type: ReminderType.TASK_OVERDUE,
      channel: ReminderChannel.IN_APP,
      userId: task.assigneeId,
      taskId: task.id,
      projectId: task.projectId,
      scheduledAt: new Date(),
    }));

    await this.reminderRepository.save(remindersToCreate);
    this.logger.log(`Overdue task reminders created for ${remindersToCreate.length} tasks`);
  }

  // Scheduled task to create project deadline reminders
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async createProjectDeadlineReminders(): Promise<void> {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const projectsDeadlineApproaching = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.manager', 'manager')
      .where('project.endDate BETWEEN :today AND :nextWeek', { today, nextWeek })
      .andWhere('project.status NOT IN (:...completedStatuses)', {
        completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      })
      .getMany();

    // Filter projects with managers
    const projectsWithManagers = projectsDeadlineApproaching.filter((p) => p.managerId);
    if (projectsWithManagers.length === 0) {
      return;
    }

    const projectIds = projectsWithManagers.map((p) => p.id);

    // Batch query: Get all existing pending reminders for these projects
    const existingReminders = await this.reminderRepository.find({
      where: {
        projectId: In(projectIds),
        type: ReminderType.PROJECT_DEADLINE,
        status: ReminderStatus.PENDING,
      },
      select: ['projectId'],
    });

    const existingProjectIds = new Set(existingReminders.map((r) => r.projectId));

    // Filter projects that don't have existing reminders
    const projectsNeedingReminders = projectsWithManagers.filter(
      (project) => !existingProjectIds.has(project.id),
    );

    if (projectsNeedingReminders.length === 0) {
      return;
    }

    // Batch insert: Create all reminders at once
    const remindersToCreate = projectsNeedingReminders.map((project) => {
      const daysUntilDeadline = Math.ceil(
        (new Date(project.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        title: `案件期限間近: ${project.name}`,
        message: `案件「${project.name}」の期限まであと${daysUntilDeadline}日です。`,
        type: ReminderType.PROJECT_DEADLINE,
        channel: ReminderChannel.IN_APP,
        userId: project.managerId,
        projectId: project.id,
        scheduledAt: new Date(),
      };
    });

    await this.reminderRepository.save(remindersToCreate);
    this.logger.log(`Project deadline reminders created for ${remindersToCreate.length} projects`);
  }

  private async sendReminder(reminder: Reminder): Promise<void> {
    // Use NotificationService to send notifications based on channel
    if (this.notificationService) {
      const success = await this.notificationService.sendReminderNotification(
        reminder,
        reminder.task,
      );

      if (!success) {
        throw new Error('Failed to send notification');
      }

      this.logger.log(`Notification sent via ${reminder.channel} for reminder: ${reminder.id}`);
    } else {
      // Fallback behavior when NotificationService is not available
      switch (reminder.channel) {
        case ReminderChannel.EMAIL:
          this.logger.log(`Email reminder would be sent to user: ${reminder.userId}`);
          break;
        case ReminderChannel.IN_APP:
          this.logger.log(`In-app reminder processed for user: ${reminder.userId}`);
          break;
        case ReminderChannel.SLACK:
          this.logger.log(`Slack reminder would be sent to user: ${reminder.userId}`);
          break;
      }
    }
  }

  /**
   * Scheduled task to detect stagnant projects (no updates in N days)
   * Sends reminders to managers about projects that haven't been updated
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async createStagnantProjectReminders(): Promise<void> {
    const stagnantDays = 7; // Configurable: days without updates
    const stagnantDate = new Date();
    stagnantDate.setDate(stagnantDate.getDate() - stagnantDays);

    const stagnantProjects = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('project.owner', 'owner')
      .where('project.updatedAt < :stagnantDate', { stagnantDate })
      .andWhere('project.status NOT IN (:...completedStatuses)', {
        completedStatuses: [
          ProjectStatus.COMPLETED,
          ProjectStatus.CANCELLED,
          ProjectStatus.ON_HOLD,
        ],
      })
      .getMany();

    this.logger.log(`Found ${stagnantProjects.length} stagnant projects`);

    // Filter projects with recipients (manager or owner)
    const projectsWithRecipients = stagnantProjects.filter(
      (p) => p.managerId || p.ownerId,
    );

    if (projectsWithRecipients.length === 0) {
      return;
    }

    const projectIds = projectsWithRecipients.map((p) => p.id);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Batch query: Get all existing stagnant reminders sent before this week
    const existingReminders = await this.reminderRepository.find({
      where: {
        projectId: In(projectIds),
        type: ReminderType.PROJECT_STAGNANT,
        createdAt: LessThanOrEqual(weekAgo),
      },
      select: ['projectId'],
    });

    const existingProjectIds = new Set(existingReminders.map((r) => r.projectId));

    // Filter projects that don't have existing reminders
    const projectsNeedingReminders = projectsWithRecipients.filter(
      (project) => !existingProjectIds.has(project.id),
    );

    if (projectsNeedingReminders.length === 0) {
      return;
    }

    // Batch insert: Create all reminders at once
    const remindersToCreate = projectsNeedingReminders.map((project) => {
      const recipientId = project.managerId || project.ownerId;
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        title: `案件が停滞しています: ${project.name}`,
        message: `案件「${project.name}」は${daysSinceUpdate}日間更新がありません。状況を確認してください。`,
        type: ReminderType.PROJECT_STAGNANT,
        channel: ReminderChannel.IN_APP,
        userId: recipientId,
        projectId: project.id,
        scheduledAt: new Date(),
      };
    });

    await this.reminderRepository.save(remindersToCreate);
    this.logger.log(`Stagnant project reminders created for ${remindersToCreate.length} projects`);
  }

  async getReminderStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    pendingCount: number;
    sentToday: number;
  }> {
    const total = await this.reminderRepository.count();

    const statusCounts = await this.reminderRepository
      .createQueryBuilder('reminder')
      .select('reminder.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('reminder.status')
      .getRawMany();

    const typeCounts = await this.reminderRepository
      .createQueryBuilder('reminder')
      .select('reminder.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('reminder.type')
      .getRawMany();

    const pendingCount = await this.reminderRepository.count({
      where: { status: ReminderStatus.PENDING },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sentToday = await this.reminderRepository
      .createQueryBuilder('reminder')
      .where('reminder.sentAt >= :todayStart', { todayStart })
      .andWhere('reminder.status = :status', { status: ReminderStatus.SENT })
      .getCount();

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((item) => {
      byStatus[item.status] = parseInt(item.count, 10);
    });

    const byType: Record<string, number> = {};
    typeCounts.forEach((item) => {
      byType[item.type] = parseInt(item.count, 10);
    });

    return {
      total,
      byStatus,
      byType,
      pendingCount,
      sentToday,
    };
  }
}
