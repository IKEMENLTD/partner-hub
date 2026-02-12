import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { AuthenticationException, AuthorizationException } from '../exceptions/business.exception';
import { ResourceNotFoundException } from '../exceptions/resource-not-found.exception';
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
      throw new AuthenticationException('AUTH_001', {
        message: 'User not authenticated',
        userMessage: '認証が必要です',
      });
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
      throw ResourceNotFoundException.forUser(user.id);
    }

    // Store organizationId in request for use by services
    request.organizationId = userProfile.organizationId;
    request.user.organizationId = userProfile.organizationId;

    if (!userProfile.organizationId) {
      if (userProfile.role === UserRole.ADMIN) {
        this.logger.debug(`Admin ${user.id} without organization - allowing access`);
        return true;
      }
      this.logger.warn(`User ${user.id} has no organization - access denied`);
      throw new AuthorizationException('ORG_001', {
        message: 'User has no organization',
        userMessage: '組織に所属していません。管理者にお問い合わせください。',
      });
    }

    return true;
  }
}
