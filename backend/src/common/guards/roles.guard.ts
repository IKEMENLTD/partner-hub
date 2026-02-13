import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { AuthenticationException, AuthorizationException } from '../exceptions/business.exception';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from '../../modules/auth/enums/user-role.enum';

/**
 * SECURITY FIX: RolesGuard with secure defaults
 * - @Roles() デコレータがない場合、認証済みユーザーのみ許可
 * - @Public() デコレータがある場合のみ、未認証アクセスを許可
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest();

    // SECURITY FIX: Require authenticated user for all non-public routes
    if (!user) {
      this.logger.warn('Access denied: No authenticated user');
      throw new AuthenticationException('AUTH_001', {
        message: 'Authentication required',
        userMessage: '認証が必要です',
      });
    }

    // Super admin bypasses all role checks
    if (user.isSuperAdmin === true) {
      return true;
    }

    // If no specific roles required, allow any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Check if user has required role
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.warn(
        `Access denied: User ${user.id} with role ${user.role} tried to access resource requiring ${requiredRoles.join(', ')}`
      );
      throw new AuthorizationException('AUTH_002', {
        message: 'Insufficient permissions',
        userMessage: '権限が不足しています',
      });
    }

    return true;
  }
}
