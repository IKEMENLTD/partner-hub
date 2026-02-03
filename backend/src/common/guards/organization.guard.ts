import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../../modules/auth/entities/user-profile.entity';
import { UserRole } from '../../modules/auth/enums/user-role.enum';

export const SKIP_ORGANIZATION_CHECK = 'skipOrganizationCheck';

export interface OrganizationAware {
  organizationId?: string;
}

/**
 * マルチテナント分離ガード
 *
 * リクエストユーザーのorganizationIdを検証し、リクエストに注入します。
 * これにより、サービス層でorganizationIdによるデータ分離が可能になります。
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipCheck = this.reflector.getAllAndOverride<boolean>(SKIP_ORGANIZATION_CHECK, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super admin without organization can access all data
    if (user.role === UserRole.ADMIN && !user.organizationId) {
      this.logger.debug(`Super admin ${user.id} bypassing organization check`);
      return true;
    }

    const userProfile = await this.userProfileRepository.findOne({
      where: { id: user.id },
    });

    if (!userProfile) {
      throw new ForbiddenException('User profile not found');
    }

    // Store organizationId in request for use by services
    request.organizationId = userProfile.organizationId;
    request.user.organizationId = userProfile.organizationId;

    if (!userProfile.organizationId) {
      this.logger.warn(`User ${user.id} has no organization - access will be restricted`);
    }

    return true;
  }
}
