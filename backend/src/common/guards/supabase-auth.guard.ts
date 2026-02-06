import {
  Injectable,
  ExecutionContext,
  Logger,
  CanActivate,
} from '@nestjs/common';
import { AuthenticationException } from '../exceptions/business.exception';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseService } from '../../modules/supabase/supabase.service';
import { UserProfile } from '../../modules/auth/entities/user-profile.entity';
import { UserRole } from '../../modules/auth/enums/user-role.enum';
import { UserProfileCacheService } from '../services/user-profile-cache.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    private userProfileCache: UserProfileCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('No token provided in Authorization header');
      throw new AuthenticationException('AUTH_001', {
        message: 'No token provided',
        userMessage: '認証トークンが必要です',
      });
    }

    try {
      // Use Supabase Admin client to verify the token
      const supabaseAdmin = this.supabaseService.admin;

      if (!supabaseAdmin) {
        this.logger.error('Supabase admin client not initialized');
        throw new AuthenticationException('AUTH_001', {
          message: 'Authentication service unavailable',
          userMessage: '認証サービスが利用できません',
        });
      }

      // JWT verification - always calls Supabase (never cached)
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);

      if (error) {
        this.logger.warn(`Token verification failed: ${error.message}`);
        throw new AuthenticationException('AUTH_003', {
          message: 'Invalid token',
          userMessage: '無効な認証トークンです',
        });
      }

      if (!user) {
        this.logger.warn('No user returned from Supabase');
        throw new AuthenticationException('AUTH_003', {
          message: 'Invalid token',
          userMessage: '無効な認証トークンです',
        });
      }

      this.logger.debug(`Supabase user verified: ${user.email}`);

      // Get user profile from cache or DB
      let userProfile = this.userProfileCache.get(user.id);

      if (userProfile) {
        this.logger.debug(`Profile cache hit for user: ${user.email}`);
      } else {
        // Cache miss - query DB
        userProfile = await this.userProfileRepository.findOne({
          where: { id: user.id },
        });

        if (!userProfile) {
          this.logger.log(`Creating profile for new user: ${user.email}`);
          userProfile = this.userProfileRepository.create({
            id: user.id,
            email: user.email || '',
            firstName: user.user_metadata?.first_name || '',
            lastName: user.user_metadata?.last_name || '',
            role: UserRole.MEMBER,
            isActive: true,
          });
          await this.userProfileRepository.save(userProfile);
          this.logger.log(`Profile created for user: ${user.email}`);
        }

        // Cache the profile
        this.userProfileCache.set(user.id, userProfile);
      }

      if (!userProfile.isActive) {
        // Remove inactive users from cache immediately
        this.userProfileCache.invalidate(user.id);
        this.logger.warn(`User is inactive: ${user.email}`);
        throw new AuthenticationException('AUTH_005', {
          message: 'User account is inactive',
          userMessage: 'アカウントが無効化されています',
        });
      }

      // Attach user profile to request
      request.user = userProfile;
      this.logger.debug(`User authenticated: ${user.email}, role=${userProfile.role}`);

      return true;
    } catch (error) {
      if (error instanceof AuthenticationException) {
        throw error;
      }
      this.logger.error(`Authentication error: ${error.message}`, error.stack);
      throw new AuthenticationException('AUTH_001', {
        message: 'Authentication failed',
        userMessage: '認証に失敗しました',
      });
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers?.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
