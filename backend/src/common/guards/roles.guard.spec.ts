import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from '../../modules/auth/enums/user-role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const mockExecutionContext = (
    user: any = null,
    requiredRoles: UserRole[] | null = null,
    isPublic: boolean = false,
  ): ExecutionContext => {
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user,
        }),
      }),
    } as unknown as ExecutionContext;

    // Mock reflector to return different values for different keys
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) {
        return isPublic;
      }
      if (key === ROLES_KEY) {
        return requiredRoles;
      }
      return null;
    });

    return context;
  };

  describe('canActivate', () => {
    it('should return true if route is public', () => {
      const context = mockExecutionContext(null, null, true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true if no roles are required and user is authenticated', () => {
      const context = mockExecutionContext({ id: 'user-123', role: UserRole.MEMBER }, null, false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user is not present on non-public route', () => {
      const context = mockExecutionContext(null, [UserRole.ADMIN], false);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should return true if user has required role', () => {
      const user = {
        id: 'user-123',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      };
      const context = mockExecutionContext(user, [UserRole.ADMIN], false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user does not have required role', () => {
      const user = {
        id: 'user-123',
        email: 'member@example.com',
        role: UserRole.MEMBER,
      };
      const context = mockExecutionContext(user, [UserRole.ADMIN], false);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should return true if user has one of multiple required roles', () => {
      const user = {
        id: 'user-123',
        email: 'manager@example.com',
        role: UserRole.MANAGER,
      };
      const context = mockExecutionContext(user, [UserRole.ADMIN, UserRole.MANAGER], false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user has none of the required roles', () => {
      const user = {
        id: 'user-123',
        email: 'partner@example.com',
        role: UserRole.PARTNER,
      };
      const context = mockExecutionContext(user, [UserRole.ADMIN, UserRole.MANAGER], false);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Role hierarchy scenarios', () => {
    it('should allow ADMIN access to admin-only routes', () => {
      const user = { id: 'admin-1', role: UserRole.ADMIN };
      const context = mockExecutionContext(user, [UserRole.ADMIN], false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow MANAGER access to manager routes', () => {
      const user = { id: 'manager-1', role: UserRole.MANAGER };
      const context = mockExecutionContext(user, [UserRole.MANAGER], false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow MEMBER access to member routes', () => {
      const user = { id: 'member-1', role: UserRole.MEMBER };
      const context = mockExecutionContext(user, [UserRole.MEMBER], false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow PARTNER access to partner routes', () => {
      const user = { id: 'partner-1', role: UserRole.PARTNER };
      const context = mockExecutionContext(user, [UserRole.PARTNER], false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user role matches any of multiple required roles', () => {
      const user = { id: 'member-1', role: UserRole.MEMBER };
      const context = mockExecutionContext(user, [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.MEMBER,
      ], false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should throw ForbiddenException for user without role property', () => {
      const user = { id: 'user-123', email: 'test@example.com' };
      const context = mockExecutionContext(user as any, [UserRole.ADMIN], false);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for undefined user on non-public route', () => {
      const context = mockExecutionContext(undefined, [UserRole.ADMIN], false);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should return true for empty required roles array with authenticated user', () => {
      const user = { id: 'user-123', role: UserRole.MEMBER };
      const context = mockExecutionContext(user, [], false);

      const result = guard.canActivate(context);

      // Empty array means no specific roles required, any authenticated user is allowed
      expect(result).toBe(true);
    });

    it('should check both handler and class for roles metadata', () => {
      const user = { id: 'user-123', role: UserRole.ADMIN };
      const context = mockExecutionContext(user, [UserRole.ADMIN], false);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        expect.arrayContaining([context.getHandler(), context.getClass()]),
      );
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        ROLES_KEY,
        expect.arrayContaining([context.getHandler(), context.getClass()]),
      );
    });
  });

  describe('Security tests', () => {
    it('should not allow role escalation', () => {
      const user = {
        id: 'user-123',
        role: UserRole.MEMBER,
        // Attacker might try to add additional roles
        roles: [UserRole.ADMIN],
      };
      const context = mockExecutionContext(user as any, [UserRole.ADMIN], false);

      // Should only check user.role, not user.roles - should throw ForbiddenException
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should handle case-sensitive role comparison', () => {
      const user = {
        id: 'user-123',
        role: 'ADMIN' as any, // uppercase - UserRole.ADMIN is 'admin' (lowercase)
      };
      const context = mockExecutionContext(user, [UserRole.ADMIN], false);

      // Should fail due to case mismatch ('ADMIN' !== 'admin')
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should reject null role', () => {
      const user = {
        id: 'user-123',
        role: null as any,
      };
      const context = mockExecutionContext(user, [UserRole.ADMIN], false);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should require authentication on non-public routes without roles', () => {
      const context = mockExecutionContext(null, null, false);

      // Non-public route without specific roles still requires authentication
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Multiple roles scenarios', () => {
    it('should allow access with first matching role', () => {
      const user = { id: 'user-123', role: UserRole.ADMIN };
      const context = mockExecutionContext(user, [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.MEMBER,
      ], false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access with middle matching role', () => {
      const user = { id: 'user-123', role: UserRole.MANAGER };
      const context = mockExecutionContext(user, [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.MEMBER,
      ], false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access with last matching role', () => {
      const user = { id: 'user-123', role: UserRole.PARTNER };
      const context = mockExecutionContext(user, [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.PARTNER,
      ], false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Public routes', () => {
    it('should allow unauthenticated access to public routes', () => {
      const context = mockExecutionContext(null, null, true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow authenticated access to public routes', () => {
      const user = { id: 'user-123', role: UserRole.MEMBER };
      const context = mockExecutionContext(user, null, true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
