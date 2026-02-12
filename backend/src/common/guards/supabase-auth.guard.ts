import {
  Injectable,
  ExecutionContext,
  Logger,
  CanActivate,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AuthenticationException } from '../exceptions/business.exception';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseService } from '../../modules/supabase/supabase.service';
import { UserProfile } from '../../modules/auth/entities/user-profile.entity';
import { UserRole } from '../../modules/auth/enums/user-role.enum';
import { UserProfileCacheService } from '../services/user-profile-cache.service';
import { OrganizationService } from '../../modules/organization/organization.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private organizationService: OrganizationService | undefined;

  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef,
    private supabaseService: SupabaseService,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    private userProfileCache: UserProfileCacheService,
  ) {}

  private getOrganizationService(): OrganizationService {
    if (!this.organizationService) {
      this.organizationService = this.moduleRef.get(OrganizationService, { strict: false });
    }
    return this.organizationService!;
  }

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
          const inviteToken = user.user_metadata?.invite_token;
          const firstName = user.user_metadata?.first_name || '';
          const lastName = user.user_metadata?.last_name || '';

          if (inviteToken) {
            // 招待トークン経由の登録: 招待を検証して組織に追加
            this.logger.log(`New user with invite token: ${user.email}`);
            const orgService = this.getOrganizationService();
            const validation = await orgService.validateInvitation(inviteToken);

            if (validation.valid && validation.invitation) {
              userProfile = this.userProfileRepository.create({
                id: user.id,
                email: user.email || '',
                firstName,
                lastName,
                role: validation.invitation.role,
                isActive: true,
                organizationId: validation.invitation.organizationId,
              });
              await this.userProfileRepository.save(userProfile);
              await orgService.acceptInvitation(inviteToken, user.id);
              this.logger.log(`User ${user.email} joined org via invitation (role: ${validation.invitation.role})`);
            } else {
              // 無効な招待トークン: 新規組織作成にフォールバック
              this.logger.warn(`Invalid invite token for ${user.email}, creating new organization`);
              userProfile = this.userProfileRepository.create({
                id: user.id,
                email: user.email || '',
                firstName,
                lastName,
                role: UserRole.ADMIN,
                isActive: true,
              });
              await this.userProfileRepository.save(userProfile);
              await orgService.createOrganizationForNewUser(user.id, user.email || '', firstName, lastName);
              // Re-fetch to get updated organizationId
              const refetchedFallback = await this.userProfileRepository.findOne({ where: { id: user.id } });
              if (refetchedFallback) userProfile = refetchedFallback;
            }
          } else {
            // 招待なし: 新規組織の管理者として作成
            this.logger.log(`Creating new organization admin for user: ${user.email}`);
            userProfile = this.userProfileRepository.create({
              id: user.id,
              email: user.email || '',
              firstName,
              lastName,
              role: UserRole.ADMIN,
              isActive: true,
            });
            await this.userProfileRepository.save(userProfile);

            // 新規組織を作成
            const orgService = this.getOrganizationService();
            await orgService.createOrganizationForNewUser(user.id, user.email || '', firstName, lastName);
            // Re-fetch to get updated organizationId
            const refetched = await this.userProfileRepository.findOne({ where: { id: user.id } });
            if (refetched) userProfile = refetched;
            this.logger.log(`New organization created for admin user: ${user.email}`);
          }
        }

        // Cache the profile
        this.userProfileCache.set(user.id, userProfile!);
      }

      if (!userProfile!.isActive) {
        // Remove inactive users from cache immediately
        this.userProfileCache.invalidate(user.id);
        this.logger.warn(`User is inactive: ${user.email}`);
        throw new AuthenticationException('AUTH_005', {
          message: 'User account is inactive',
          userMessage: 'アカウントが有効化されていません。管理者にお問い合わせください。',
        });
      }

      // Attach user profile to request
      request.user = userProfile!;
      this.logger.debug(`User authenticated: ${user.email}, role=${userProfile!.role}`);

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
