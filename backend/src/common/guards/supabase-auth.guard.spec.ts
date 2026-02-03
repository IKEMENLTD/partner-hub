import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseService } from '../../modules/supabase/supabase.service';
import { UserProfile } from '../../modules/auth/entities/user-profile.entity';
import { UserRole } from '../../modules/auth/enums/user-role.enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let reflector: Reflector;
  let supabaseService: SupabaseService;
  let userProfileRepository: Repository<UserProfile>;

  const mockSupabaseUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      first_name: 'John',
      last_name: 'Doe',
    },
  };

  const mockUserProfile = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.MEMBER,
    isActive: true,
    organizationId: 'org-123',
    get fullName() { return `${this.firstName} ${this.lastName}`; },
  } as unknown as UserProfile;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: SupabaseService,
          useValue: {
            admin: {
              auth: {
                getUser: jest.fn(),
              },
            },
          },
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<SupabaseAuthGuard>(SupabaseAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    supabaseService = module.get<SupabaseService>(SupabaseService);
    userProfileRepository = module.get<Repository<UserProfile>>(
      getRepositoryToken(UserProfile),
    );
  });

  const mockExecutionContext = (
    authHeader?: string,
    isPublic: boolean = false,
  ): ExecutionContext => {
    const request = {
      headers: authHeader ? { authorization: authHeader } : {},
      user: null,
    };

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) {
        return isPublic;
      }
      return null;
    });

    return context;
  };

  describe('canActivate', () => {
    it('should return true for public routes', async () => {
      const context = mockExecutionContext(undefined, true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      const context = mockExecutionContext(undefined, false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid token format', async () => {
      const context = mockExecutionContext('InvalidToken', false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should authenticate valid token and existing user', async () => {
      const context = mockExecutionContext('Bearer valid-token', false);

      jest.spyOn(supabaseService.admin.auth, 'getUser').mockResolvedValue({
        data: { user: mockSupabaseUser as any },
        error: null,
      });

      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(mockUserProfile);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(supabaseService.admin.auth.getUser).toHaveBeenCalledWith('valid-token');
    });

    it('should create new user profile for new users', async () => {
      const context = mockExecutionContext('Bearer valid-token', false);

      jest.spyOn(supabaseService.admin.auth, 'getUser').mockResolvedValue({
        data: { user: mockSupabaseUser as any },
        error: null,
      });

      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userProfileRepository, 'create').mockReturnValue(mockUserProfile);
      jest.spyOn(userProfileRepository, 'save').mockResolvedValue(mockUserProfile);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(userProfileRepository.create).toHaveBeenCalled();
      expect(userProfileRepository.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when Supabase returns error', async () => {
      const context = mockExecutionContext('Bearer invalid-token', false);

      jest.spyOn(supabaseService.admin.auth, 'getUser').mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token', status: 401 } as any,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const context = mockExecutionContext('Bearer valid-token', false);
      const inactiveUser = {
        ...mockUserProfile,
        isActive: false,
        get fullName() { return `${this.firstName} ${this.lastName}`; },
      } as unknown as UserProfile;

      jest.spyOn(supabaseService.admin.auth, 'getUser').mockResolvedValue({
        data: { user: mockSupabaseUser as any },
        error: null,
      });

      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(inactiveUser);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when Supabase admin client is not available', async () => {
      const context = mockExecutionContext('Bearer valid-token', false);

      // Temporarily set admin to null
      const originalAdmin = supabaseService.admin;
      Object.defineProperty(supabaseService, 'admin', {
        get: () => null,
        configurable: true,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      // Restore
      Object.defineProperty(supabaseService, 'admin', {
        get: () => originalAdmin,
        configurable: true,
      });
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract Bearer token correctly', async () => {
      const context = mockExecutionContext('Bearer my-token', false);

      jest.spyOn(supabaseService.admin.auth, 'getUser').mockResolvedValue({
        data: { user: mockSupabaseUser as any },
        error: null,
      });

      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(mockUserProfile);

      await guard.canActivate(context);

      expect(supabaseService.admin.auth.getUser).toHaveBeenCalledWith('my-token');
    });

    it('should return undefined for non-Bearer tokens', async () => {
      const context = mockExecutionContext('Basic my-token', false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty authorization header', async () => {
      const context = mockExecutionContext('', false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle user with missing metadata', async () => {
      const context = mockExecutionContext('Bearer valid-token', false);
      const userWithoutMetadata = {
        id: 'user-456',
        email: 'noname@example.com',
      };

      jest.spyOn(supabaseService.admin.auth, 'getUser').mockResolvedValue({
        data: { user: userWithoutMetadata as any },
        error: null,
      });

      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userProfileRepository, 'create').mockImplementation((dto) => ({
        ...dto,
        firstName: dto.firstName || '',
        lastName: dto.lastName || '',
      } as UserProfile));
      jest.spyOn(userProfileRepository, 'save').mockResolvedValue({
        id: 'user-456',
        email: 'noname@example.com',
        firstName: '',
        lastName: '',
        role: UserRole.MEMBER,
        isActive: true,
      } as UserProfile);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle generic errors', async () => {
      const context = mockExecutionContext('Bearer valid-token', false);

      jest.spyOn(supabaseService.admin.auth, 'getUser').mockRejectedValue(
        new Error('Network error'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
