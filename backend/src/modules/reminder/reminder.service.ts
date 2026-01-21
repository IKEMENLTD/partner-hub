import {
  Injectable,
  NotFoundException,
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

  async create(
    createReminderDto: CreateReminderDto,
    createdById: string,
  ): Promise<Reminder> {
    const reminder = this.reminderRepository.create({
      ...createReminderDto,
      createdById,
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

    queryBuilder.orderBy(`reminder.${sortBy}`, sortOrder);

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
      throw new NotFoundException(`Reminder with ID "${id}" not found`);
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
    await this.reminderRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );

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

    for (const task of tasksDueTomorrow) {
      if (task.assigneeId) {
        // Check if reminder already exists
        const existingReminder = await this.reminderRepository.findOne({
          where: {
            taskId: task.id,
            type: ReminderType.TASK_DUE,
            status: ReminderStatus.PENDING,
          },
        });

        if (!existingReminder) {
          await this.reminderRepository.save({
            title: `Task Due Tomorrow: ${task.title}`,
            message: `Your task "${task.title}" is due tomorrow.`,
            type: ReminderType.TASK_DUE,
            channel: ReminderChannel.IN_APP,
            userId: task.assigneeId,
            taskId: task.id,
            projectId: task.projectId,
            scheduledAt: new Date(),
          });

          this.logger.log(`Task due reminder created for: ${task.title}`);
        }
      }
    }
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

    for (const task of overdueTasks) {
      if (task.assigneeId) {
        // Check if reminder was sent today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const existingReminder = await this.reminderRepository.findOne({
          where: {
            taskId: task.id,
            type: ReminderType.TASK_OVERDUE,
            createdAt: LessThanOrEqual(todayStart),
          },
        });

        if (!existingReminder) {
          await this.reminderRepository.save({
            title: `Task Overdue: ${task.title}`,
            message: `Your task "${task.title}" is overdue. Please update its status.`,
            type: ReminderType.TASK_OVERDUE,
            channel: ReminderChannel.IN_APP,
            userId: task.assigneeId,
            taskId: task.id,
            projectId: task.projectId,
            scheduledAt: new Date(),
          });

          this.logger.log(`Overdue task reminder created for: ${task.title}`);
        }
      }
    }
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

    for (const project of projectsDeadlineApproaching) {
      if (project.managerId) {
        const existingReminder = await this.reminderRepository.findOne({
          where: {
            projectId: project.id,
            type: ReminderType.PROJECT_DEADLINE,
            status: ReminderStatus.PENDING,
          },
        });

        if (!existingReminder) {
          const daysUntilDeadline = Math.ceil(
            (new Date(project.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );

          await this.reminderRepository.save({
            title: `Project Deadline Approaching: ${project.name}`,
            message: `Project "${project.name}" deadline is in ${daysUntilDeadline} days.`,
            type: ReminderType.PROJECT_DEADLINE,
            channel: ReminderChannel.IN_APP,
            userId: project.managerId,
            projectId: project.id,
            scheduledAt: new Date(),
          });

          this.logger.log(`Project deadline reminder created for: ${project.name}`);
        }
      }
    }
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
        case ReminderChannel.BOTH:
          this.logger.log(`Both email and in-app reminder for user: ${reminder.userId}`);
          break;
      }
    }
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
