import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { AuthenticationException, AuthorizationException } from '../../../common/exceptions/business.exception';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectStakeholder } from '../entities/project-stakeholder.entity';
import { UserRole } from '../../auth/enums/user-role.enum';

export const SKIP_PROJECT_ACCESS_CHECK = 'skipProjectAccessCheck';

/**
 * Guard to check if the current user has access to a specific project.
 * Access is granted if the user is:
 * - An admin (bypasses all checks)
 * - The project owner
 * - The project manager
 * - The project creator
 * - A stakeholder of the project (via partner association)
 */
@Injectable()
export class ProjectAccessGuard implements CanActivate {
  private readonly logger = new Logger(ProjectAccessGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectStakeholder)
    private stakeholderRepository: Repository<ProjectStakeholder>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if access check should be skipped
    const skipCheck = this.reflector.getAllAndOverride<boolean>(SKIP_PROJECT_ACCESS_CHECK, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new AuthenticationException('AUTH_001', {
        message: 'User not authenticated',
        userMessage: '認証が必要です',
      });
    }

    // Admin users have access to all projects
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Get project ID from route parameters
    const projectId = request.params.id || request.params.projectId;

    if (!projectId) {
      // If no project ID in params, allow the request (might be a create or list operation)
      return true;
    }

    // Fetch the project with partners relation
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['partners'],
    });

    if (!project) {
      throw ResourceNotFoundException.forProject(projectId);
    }

    // Check if user has direct access
    const hasDirectAccess = this.checkDirectAccess(project, user.id);
    if (hasDirectAccess) {
      return true;
    }

    // Check if user is a stakeholder through partner association
    const isStakeholder = await this.checkStakeholderAccess(projectId, user.id);
    if (isStakeholder) {
      return true;
    }

    this.logger.warn(`Access denied for user ${user.id} to project ${projectId}`);
    throw new AuthorizationException('PROJECT_002', {
      message: 'You do not have permission to access this project',
      userMessage: 'このプロジェクトへのアクセス権限がありません',
    });
  }

  /**
   * Check if user has direct access to the project
   * (owner, manager, or creator)
   */
  private checkDirectAccess(project: Project, userId: string): boolean {
    // Owner has access
    if (project.ownerId === userId) {
      return true;
    }

    // Manager has access
    if (project.managerId === userId) {
      return true;
    }

    // Creator has access
    if (project.createdById === userId) {
      return true;
    }

    return false;
  }

  /**
   * Check if user is a stakeholder of the project
   * This checks if the user's partner organization is listed as a stakeholder
   */
  private async checkStakeholderAccess(projectId: string, userId: string): Promise<boolean> {
    // Check if user is associated with any stakeholder partner
    // This requires querying the stakeholders table and checking partner associations
    const stakeholders = await this.stakeholderRepository
      .createQueryBuilder('stakeholder')
      .leftJoin('stakeholder.partner', 'partner')
      .leftJoin('partner.user', 'user')
      .where('stakeholder.projectId = :projectId', { projectId })
      .andWhere('user.id = :userId', { userId })
      .getCount();

    return stakeholders > 0;
  }
}
