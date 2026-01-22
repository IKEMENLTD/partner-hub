import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from '../entities/partner.entity';
import { Project } from '../../project/entities/project.entity';
import { UserRole } from '../../auth/enums/user-role.enum';

export const SKIP_PARTNER_ACCESS_CHECK = 'skipPartnerAccessCheck';

/**
 * Guard to check if the current user has access to a specific partner.
 * Access is granted if the user is:
 * - An admin (bypasses all checks)
 * - A manager (can view/manage partners)
 * - Associated with a project that involves this partner
 * - The partner's linked user account
 */
@Injectable()
export class PartnerAccessGuard implements CanActivate {
  private readonly logger = new Logger(PartnerAccessGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if access check should be skipped
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_PARTNER_ACCESS_CHECK,
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

    // Admin and Manager users have access to all partners
    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
      return true;
    }

    // Get partner ID from route parameters
    const partnerId = request.params.id;

    if (!partnerId) {
      // If no partner ID in params, allow the request (might be a list operation)
      return true;
    }

    // Fetch the partner
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
      relations: ['user'],
    });

    if (!partner) {
      throw new NotFoundException(`Partner with ID "${partnerId}" not found`);
    }

    // Check if user is the partner's linked user account
    if (partner.userId === user.id) {
      return true;
    }

    // Check if user is associated with any project that involves this partner
    const hasProjectAccess = await this.checkProjectAssociation(
      partnerId,
      user.id,
    );
    if (hasProjectAccess) {
      return true;
    }

    this.logger.warn(
      `Access denied for user ${user.id} to partner ${partnerId}`,
    );
    throw new ForbiddenException(
      'You do not have permission to access this partner',
    );
  }

  /**
   * Check if user is associated with any project that involves this partner
   */
  private async checkProjectAssociation(
    partnerId: string,
    userId: string,
  ): Promise<boolean> {
    // Find projects that:
    // 1. Have this partner associated
    // 2. The user is owner, manager, or creator of
    const projects = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project.partners', 'partners')
      .where('partners.id = :partnerId', { partnerId })
      .andWhere(
        '(project.ownerId = :userId OR project.managerId = :userId OR project.createdById = :userId)',
        { userId },
      )
      .getCount();

    return projects > 0;
  }
}
