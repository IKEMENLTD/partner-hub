import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationGuard, SKIP_ORGANIZATION_CHECK } from './organization.guard';
import { UserProfile } from '../../modules/auth/entities/user-profile.entity';
import { UserRole } from '../../modules/auth/enums/user-role.enum';
import { AuthenticationException, AuthorizationException } from '../exceptions/business.exception';
import { ResourceNotFoundException } from '../exceptions/resource-not-found.exception';

describe('OrganizationGuard', () => {
  let guard: OrganizationGuard;
  let reflector: Reflector;
  let userProfileRepository: Repository<UserProfile>;

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
        OrganizationGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<OrganizationGuard>(OrganizationGuard);
    reflector = module.get<Reflector>(Reflector);
    userProfileRepository = module.get<Repository<UserProfile>>(
      getRepositoryToken(UserProfile),
    );
  });

  const mockExecutionContext = (
    user: any = null,
    skipCheck: boolean = false,
  ): ExecutionContext => {
    const request = {
      user,
      organizationId: undefined,
    };

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === SKIP_ORGANIZATION_CHECK) {
        return skipCheck;
      }
      return null;
    });

    return context;
  };

  describe('canActivate', () => {
    it('should return true when skip organization check is enabled', async () => {
      const context = mockExecutionContext(null, true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw AuthenticationException when user is not authenticated', async () => {
      const context = mockExecutionContext(null, false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        AuthenticationException,
      );
    });

    it('should deny access for admin without organization', async () => {
      const superAdmin = {
        id: 'admin-123',
        role: UserRole.ADMIN,
        organizationId: null,
      };
      const context = mockExecutionContext(superAdmin, false);
      const adminProfile = { ...mockUserProfile, id: 'admin-123', role: UserRole.ADMIN, organizationId: null } as unknown as UserProfile;
      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(adminProfile);

      await expect(guard.canActivate(context)).rejects.toThrow(AuthorizationException);
    });

    it('should throw ResourceNotFoundException when user profile not found', async () => {
      const user = {
        id: 'user-123',
        role: UserRole.MEMBER,
        organizationId: 'org-123',
      };
      const context = mockExecutionContext(user, false);

      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should store organizationId in request for normal users', async () => {
      const user = {
        id: 'user-123',
        role: UserRole.MEMBER,
        organizationId: undefined,
      };
      const context = mockExecutionContext(user, false);
      const request = context.switchToHttp().getRequest();

      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(mockUserProfile);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.organizationId).toBe('org-123');
      expect(request.user.organizationId).toBe('org-123');
    });

    it('should deny access for member without organization', async () => {
      const user = {
        id: 'user-456',
        role: UserRole.MEMBER,
        organizationId: undefined,
      };
      const context = mockExecutionContext(user, false);
      const userWithoutOrg = { ...mockUserProfile, id: 'user-456', organizationId: null } as unknown as UserProfile;

      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(userWithoutOrg);

      await expect(guard.canActivate(context)).rejects.toThrow(AuthorizationException);
    });
  });

  describe('Role-based organization check', () => {
    it('should allow ADMIN with organization to access', async () => {
      const admin = {
        id: 'admin-123',
        role: UserRole.ADMIN,
        organizationId: 'org-123',
      };
      const context = mockExecutionContext(admin, false);

      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue({
        ...mockUserProfile,
        role: UserRole.ADMIN,
      } as unknown as UserProfile);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow MEMBER to access their organization', async () => {
      const member = {
        id: 'member-123',
        role: UserRole.MEMBER,
        organizationId: 'org-123',
      };
      const context = mockExecutionContext(member, false);

      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue({
        ...mockUserProfile,
        role: UserRole.MEMBER,
      } as unknown as UserProfile);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle user with undefined role', async () => {
      const user = {
        id: 'user-123',
        role: undefined,
        organizationId: 'org-123',
      };
      const context = mockExecutionContext(user, false);

      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(mockUserProfile);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should call reflector with correct parameters', async () => {
      const user = {
        id: 'user-123',
        role: UserRole.MEMBER,
      };
      const context = mockExecutionContext(user, false);

      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(mockUserProfile);

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        SKIP_ORGANIZATION_CHECK,
        expect.arrayContaining([context.getHandler(), context.getClass()]),
      );
    });
  });
});
