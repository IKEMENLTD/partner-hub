import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan, Not, In } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto, UpdateTaskDto, QueryTaskDto, BulkCreateTaskDto } from './dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { TaskStatus } from './enums/task-status.enum';
import { HealthScoreService } from '../project/services/health-score.service';
import { EmailService } from '../notification/services/email.service';
import { Partner } from '../partner/entities/partner.entity';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

// SECURITY FIX: Whitelist of allowed sort columns to prevent SQL injection
const ALLOWED_SORT_COLUMNS = [
  'createdAt',
  'updatedAt',
  'title',
  'status',
  'priority',
  'type',
  'dueDate',
  'progress',
  'estimatedHours',
  'actualHours',
  'completedAt',
];

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @Inject(forwardRef(() => HealthScoreService))
    private healthScoreService: HealthScoreService,
    private emailService: EmailService,
  ) {}

  async create(createTaskDto: CreateTaskDto, createdById: string): Promise<Task> {
    // Validate parent task if provided
    if (createTaskDto.parentTaskId) {
      const parentTask = await this.taskRepository.findOne({
        where: { id: createTaskDto.parentTaskId },
      });
      if (!parentTask) {
        throw new ResourceNotFoundException('TASK_009', {
          resourceType: 'Task',
          resourceId: createTaskDto.parentTaskId,
          userMessage: '親タスクが見つかりません',
        });
      }
    }

    // Sanitize tags: ensure it's an array (handle empty strings or invalid values)
    const sanitizedTags = Array.isArray(createTaskDto.tags)
      ? createTaskDto.tags.filter((tag) => typeof tag === 'string' && tag.trim() !== '')
      : [];

    const task = this.taskRepository.create({
      ...createTaskDto,
      tags: sanitizedTags,
      createdById,
    });

    await this.taskRepository.save(task);
    this.logger.log(`Task created: ${task.title} (${task.id})`);

    // Update project health score if task belongs to a project
    if (task.projectId) {
      await this.healthScoreService.onTaskChanged(task.projectId);
    }

    return this.findOne(task.id);
  }

  async bulkCreate(dto: BulkCreateTaskDto, createdById: string): Promise<Task[]> {
    const tasks = dto.tasks.map((item) =>
      this.taskRepository.create({
        title: item.title,
        projectId: dto.projectId,
        status: TaskStatus.TODO,
        priority: 'medium' as any,
        createdById,
      }),
    );

    const savedTasks = await this.taskRepository.save(tasks);
    this.logger.log(`Bulk created ${savedTasks.length} tasks for project ${dto.projectId}`);

    // Update project health score once
    await this.healthScoreService.onTaskChanged(dto.projectId);

    return savedTasks;
  }

  async findAll(queryDto: QueryTaskDto): Promise<PaginatedResponseDto<Task>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
      priority,
      type,
      search,
      projectId,
      assigneeId,
      partnerId,
      parentTaskId,
      rootOnly,
      dueDateFrom,
      dueDateTo,
      overdueOnly,
    } = queryDto;

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.partner', 'partner')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.subtasks', 'subtasks');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority });
    }

    if (type) {
      queryBuilder.andWhere('task.type = :type', { type });
    }

    if (search) {
      queryBuilder.andWhere('(task.title ILIKE :search OR task.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (projectId) {
      queryBuilder.andWhere('task.projectId = :projectId', { projectId });
    }

    if (assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', { assigneeId });
    }

    if (partnerId) {
      queryBuilder.andWhere('task.partnerId = :partnerId', { partnerId });
    }

    if (parentTaskId) {
      queryBuilder.andWhere('task.parentTaskId = :parentTaskId', { parentTaskId });
    }

    if (rootOnly) {
      queryBuilder.andWhere('task.parentTaskId IS NULL');
    }

    if (dueDateFrom) {
      queryBuilder.andWhere('task.dueDate >= :dueDateFrom', { dueDateFrom });
    }

    if (dueDateTo) {
      queryBuilder.andWhere('task.dueDate <= :dueDateTo', { dueDateTo });
    }

    if (overdueOnly) {
      const today = new Date();
      queryBuilder.andWhere('task.dueDate < :today', { today });
      queryBuilder.andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      });
    }

    // SECURITY FIX: Validate sortBy against whitelist to prevent SQL injection
    const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`task.${safeSortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['project', 'assignee', 'partner', 'parentTask', 'subtasks', 'createdBy'],
    });

    if (!task) {
      throw ResourceNotFoundException.forTask(id);
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    const originalProjectId = task.projectId;

    // Validate parent task if changing
    if (updateTaskDto.parentTaskId && updateTaskDto.parentTaskId !== task.parentTaskId) {
      if (updateTaskDto.parentTaskId === id) {
        throw new BusinessException('TASK_010', {
          message: 'タスクを自身の親に設定することはできません',
          userMessage: 'タスクに循環参照が検出されました',
        });
      }
      const parentTask = await this.taskRepository.findOne({
        where: { id: updateTaskDto.parentTaskId },
      });
      if (!parentTask) {
        throw new ResourceNotFoundException('TASK_009', {
          resourceType: 'Task',
          resourceId: updateTaskDto.parentTaskId,
          userMessage: '親タスクが見つかりません',
        });
      }
    }

    // Sanitize tags if provided: ensure it's an array (handle empty strings or invalid values)
    if (updateTaskDto.tags !== undefined) {
      updateTaskDto.tags = Array.isArray(updateTaskDto.tags)
        ? updateTaskDto.tags.filter((tag) => typeof tag === 'string' && tag.trim() !== '')
        : [];
    }

    Object.assign(task, updateTaskDto);
    await this.taskRepository.save(task);

    this.logger.log(`Task updated: ${task.title} (${task.id})`);

    // Update project health score if task belongs to a project
    if (task.projectId) {
      await this.healthScoreService.onTaskChanged(task.projectId);
    }
    // If project changed, also update the original project
    if (originalProjectId && originalProjectId !== task.projectId) {
      await this.healthScoreService.onTaskChanged(originalProjectId);
    }

    return this.findOne(task.id);
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const task = await this.findOne(id);
    task.status = status;

    if (status === TaskStatus.COMPLETED) {
      task.completedAt = new Date();
      task.progress = 100;
    }

    await this.taskRepository.save(task);
    this.logger.log(`Task status updated: ${task.title} -> ${status}`);

    // Update project health score if task belongs to a project
    if (task.projectId) {
      await this.healthScoreService.onTaskChanged(task.projectId);
    }

    return task;
  }

  async updateProgress(id: string, progress: number): Promise<Task> {
    const task = await this.findOne(id);
    task.progress = progress;

    if (progress === 100) {
      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();
    }

    await this.taskRepository.save(task);
    this.logger.log(`Task progress updated: ${task.title} -> ${progress}%`);

    // Update project health score if task belongs to a project
    if (task.projectId) {
      await this.healthScoreService.onTaskChanged(task.projectId);
    }

    return task;
  }

  async assignTask(taskId: string, assigneeId: string): Promise<Task> {
    const task = await this.findOne(taskId);
    task.assigneeId = assigneeId;
    await this.taskRepository.save(task);

    this.logger.log(`Task assigned: ${task.title} -> ${assigneeId}`);

    return this.findOne(taskId);
  }

  async assignToPartner(taskId: string, partnerId: string): Promise<Task> {
    const task = await this.findOne(taskId);
    task.partnerId = partnerId;
    await this.taskRepository.save(task);

    this.logger.log(`Task assigned to partner: ${task.title} -> ${partnerId}`);

    // Send email notification to the partner (async, don't block response)
    const partner = await this.partnerRepository.findOne({ where: { id: partnerId } });
    if (partner) {
      this.emailService.sendTaskAssignmentEmail(task, partner).catch((error) => {
        this.logger.error(`Failed to send task assignment email to ${partner.email}`, error);
      });
    }

    return this.findOne(taskId);
  }

  async findDeleted(): Promise<Task[]> {
    return this.taskRepository.find({
      withDeleted: true,
      where: { deletedAt: Not(IsNull()) },
      relations: ['project'],
      order: { deletedAt: 'DESC' },
    });
  }

  async restore(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!task || !task.deletedAt) {
      throw ResourceNotFoundException.forTask(id);
    }
    await this.taskRepository.recover(task);
    this.logger.log(`Task restored: ${task.title} (${id})`);

    // Update project health score if task belongs to a project
    if (task.projectId) {
      await this.healthScoreService.onTaskChanged(task.projectId);
    }

    return task;
  }

  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);
    const projectId = task.projectId;
    // Use soft delete instead of hard delete
    await this.taskRepository.softRemove(task);
    this.logger.log(`Task soft deleted: ${task.title} (${id})`);

    // Update project health score if task belonged to a project
    if (projectId) {
      await this.healthScoreService.onTaskChanged(projectId);
    }
  }

  /**
   * Permanently delete a task (admin only)
   */
  async forceRemove(id: string): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!task) {
      throw ResourceNotFoundException.forTask(id);
    }
    const projectId = task.projectId;
    await this.taskRepository.remove(task);
    this.logger.log(`Task permanently deleted: ${task.title} (${id})`);

    // Update project health score if task belonged to a project
    if (projectId) {
      await this.healthScoreService.onTaskChanged(projectId);
    }
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { projectId },
      relations: ['assignee', 'partner', 'subtasks'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTasksByAssignee(assigneeId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { assigneeId },
      relations: ['project', 'partner'],
      order: { dueDate: 'ASC' },
    });
  }

  async getTasksByPartner(partnerId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { partnerId },
      relations: ['project', 'assignee'],
      order: { dueDate: 'ASC' },
    });
  }

  async getOverdueTasks(): Promise<Task[]> {
    const today = new Date();
    return this.taskRepository.find({
      where: {
        dueDate: LessThan(today),
        status: Not(In([TaskStatus.COMPLETED, TaskStatus.CANCELLED])),
      },
      relations: ['project', 'assignee', 'partner'],
      order: { dueDate: 'ASC' },
    });
  }

  async getUpcomingTasks(days: number = 7): Promise<Task[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.partner', 'partner')
      .where('task.dueDate BETWEEN :today AND :futureDate', { today, futureDate })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .orderBy('task.dueDate', 'ASC')
      .getMany();
  }

  async getSubtasks(parentTaskId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { parentTaskId },
      relations: ['assignee', 'partner'],
      order: { createdAt: 'ASC' },
    });
  }

  async getTaskStatistics(projectId?: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
    overdue: number;
    completionRate: number;
  }> {
    const queryBuilder = this.taskRepository.createQueryBuilder('task');

    if (projectId) {
      queryBuilder.andWhere('task.projectId = :projectId', { projectId });
    }

    const total = await queryBuilder.getCount();

    const statusCounts = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(projectId ? 'task.projectId = :projectId' : '1=1', { projectId })
      .groupBy('task.status')
      .getRawMany();

    const priorityCounts = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where(projectId ? 'task.projectId = :projectId' : '1=1', { projectId })
      .groupBy('task.priority')
      .getRawMany();

    const typeCounts = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where(projectId ? 'task.projectId = :projectId' : '1=1', { projectId })
      .groupBy('task.type')
      .getRawMany();

    const today = new Date();
    const overdueBuilder = this.taskRepository
      .createQueryBuilder('task')
      .where('task.dueDate < :today', { today })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      });
    if (projectId) {
      overdueBuilder.andWhere('task.projectId = :projectId', { projectId });
    }
    const overdue = await overdueBuilder.getCount();

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

    const completed = byStatus[TaskStatus.COMPLETED] || 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      byStatus,
      byPriority,
      byType,
      overdue,
      completionRate,
    };
  }
}
