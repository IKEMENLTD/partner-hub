import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
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

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

    return context;
  };

  describe('canActivate', () => {
    it('should return true if no roles are required', () => {
      const context = mockExecutionContext({ id: 'user-123', role: UserRole.MEMBER }, null);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should return false if user is not present', () => {
      const context = mockExecutionContext(null, [UserRole.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return true if user has required role', () => {
      const user = {
        id: 'user-123',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      };
      const context = mockExecutionContext(user, [UserRole.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false if user does not have required role', () => {
      const user = {
        id: 'user-123',
        email: 'member@example.com',
        role: UserRole.MEMBER,
      };
      const context = mockExecutionContext(user, [UserRole.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return true if user has one of multiple required roles', () => {
      const user = {
        id: 'user-123',
        email: 'manager@example.com',
        role: UserRole.MANAGER,
      };
      const context = mockExecutionContext(user, [UserRole.ADMIN, UserRole.MANAGER]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false if user has none of the required roles', () => {
      const user = {
        id: 'user-123',
        email: 'partner@example.com',
        role: UserRole.PARTNER,
      };
      const context = mockExecutionContext(user, [UserRole.ADMIN, UserRole.MANAGER]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });

  describe('Role hierarchy scenarios', () => {
    it('should allow ADMIN access to admin-only routes', () => {
      const user = { id: 'admin-1', role: UserRole.ADMIN };
      const context = mockExecutionContext(user, [UserRole.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow MANAGER access to manager routes', () => {
      const user = { id: 'manager-1', role: UserRole.MANAGER };
      const context = mockExecutionContext(user, [UserRole.MANAGER]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow MEMBER access to member routes', () => {
      const user = { id: 'member-1', role: UserRole.MEMBER };
      const context = mockExecutionContext(user, [UserRole.MEMBER]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow PARTNER access to partner routes', () => {
      const user = { id: 'partner-1', role: UserRole.PARTNER };
      const context = mockExecutionContext(user, [UserRole.PARTNER]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user role matches any of multiple required roles', () => {
      const user = { id: 'member-1', role: UserRole.MEMBER };
      const context = mockExecutionContext(user, [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.MEMBER,
      ]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle user without role property', () => {
      const user = { id: 'user-123', email: 'test@example.com' };
      const context = mockExecutionContext(user as any, [UserRole.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle undefined user', () => {
      const context = mockExecutionContext(undefined, [UserRole.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle empty required roles array', () => {
      const user = { id: 'user-123', role: UserRole.MEMBER };
      const context = mockExecutionContext(user, []);

      const result = guard.canActivate(context);

      // Empty array means no roles required, but the guard checks if array exists
      // In this case, it will return false because no role matches
      expect(result).toBe(false);
    });

    it('should check both handler and class for roles metadata', () => {
      const user = { id: 'user-123', role: UserRole.ADMIN };
      const context = mockExecutionContext(user, [UserRole.ADMIN]);

      guard.canActivate(context);

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
      const context = mockExecutionContext(user as any, [UserRole.ADMIN]);

      const result = guard.canActivate(context);

      // Should only check user.role, not user.roles
      expect(result).toBe(false);
    });

    it('should handle case-sensitive role comparison', () => {
      const user = {
        id: 'user-123',
        role: 'ADMIN' as any, // uppercase - UserRole.ADMIN is 'admin' (lowercase)
      };
      const context = mockExecutionContext(user, [UserRole.ADMIN]);

      const result = guard.canActivate(context);

      // Should fail due to case mismatch ('ADMIN' !== 'admin')
      expect(result).toBe(false);
    });

    it('should reject null role', () => {
      const user = {
        id: 'user-123',
        role: null as any,
      };
      const context = mockExecutionContext(user, [UserRole.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });

  describe('Multiple roles scenarios', () => {
    it('should allow access with first matching role', () => {
      const user = { id: 'user-123', role: UserRole.ADMIN };
      const context = mockExecutionContext(user, [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.MEMBER,
      ]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access with middle matching role', () => {
      const user = { id: 'user-123', role: UserRole.MANAGER };
      const context = mockExecutionContext(user, [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.MEMBER,
      ]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access with last matching role', () => {
      const user = { id: 'user-123', role: UserRole.PARTNER };
      const context = mockExecutionContext(user, [
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.PARTNER,
      ]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
