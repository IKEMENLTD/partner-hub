import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationException } from '../exceptions/business.exception';
import { IS_SUPER_ADMIN_KEY } from '../decorators/super-admin.decorator';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  private readonly logger = new Logger(SuperAdminGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireSuperAdmin = this.reflector.getAllAndOverride<boolean>(IS_SUPER_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requireSuperAdmin) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || user.isSuperAdmin !== true) {
      this.logger.warn(`Super admin access denied for user: ${user?.id || 'unknown'}`);
      throw new AuthorizationException('AUTH_004', {
        message: 'Super admin access required',
        userMessage: 'この操作にはシステム管理者権限が必要です',
      });
    }

    return true;
  }
}
