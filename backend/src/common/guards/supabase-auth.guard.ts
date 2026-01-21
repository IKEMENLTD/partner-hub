import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SupabaseAuthGuard extends AuthGuard('supabase-jwt') {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err) {
      this.logger.error(`Auth error: ${err.message}`, err.stack);
      throw err;
    }

    if (info) {
      this.logger.warn(`JWT Info: ${info.message || info}`);
    }

    if (!user) {
      this.logger.warn('No user returned from JWT validation');
      throw new UnauthorizedException(info?.message || 'Authentication required');
    }

    return user;
  }
}
