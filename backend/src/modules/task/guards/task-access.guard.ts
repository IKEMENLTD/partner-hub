import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { ProjectService } from '../../project/project.service';
import { UserRole } from '../../auth/enums/user-role.enum';

export const SKIP_TASK_ACCESS_CHECK = 'skipTaskAccessCheck';

/**
 * Guard to check if the current user has access to a specific task.
 * Access is granted if the user is:
 * - An admin (bypasses all checks)
 * - Has access to the task's parent project (via ProjectService.checkAccess)
 * - Is the task assignee
 * - Is the task creator
 */
@Injectable()
export class TaskAccessGuard implements CanActivate {
  private readonly logger = new Logger(TaskAccessGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @Inject(forwardRef(() => ProjectService))
    private projectService: ProjectService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if access check should be skipped
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_TASK_ACCESS_CHECK,
      [context.getHandler(), context.getClass()],
    );

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin users have access to all tasks
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Get task ID from route parameters
    const taskId = request.params.id;

    if (!taskId) {
      // If no task ID in params, allow the request (might be a create or list operation)
      return true;
    }

    // Fetch the task
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${taskId}" not found`);
    }

    // Check if user has direct access to the task
    const hasDirectAccess = this.checkDirectAccess(task, user.id);
    if (hasDirectAccess) {
      return true;
    }

    // Check if user has access to the task's project
    if (task.projectId) {
      const hasProjectAccess = await this.projectService.checkAccess(
        task.projectId,
        user.id,
      );
      if (hasProjectAccess) {
        return true;
      }
    }

    this.logger.warn(`Access denied for user ${user.id} to task ${taskId}`);
    throw new ForbiddenException(
      'You do not have permission to access this task',
    );
  }

  /**
   * Check if user has direct access to the task
   * (assignee or creator)
   */
  private checkDirectAccess(task: Task, userId: string): boolean {
    // Assignee has access
    if (task.assigneeId === userId) {
      return true;
    }

    // Creator has access
    if (task.createdById === userId) {
      return true;
    }

    return false;
  }
}
