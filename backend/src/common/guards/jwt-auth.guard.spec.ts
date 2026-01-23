import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;

    guard = new JwtAuthGuard(reflector);
  });

  const createMockContext = (): ExecutionContext => {
    return {
      getHandler: jest.fn().mockReturnValue(() => {}),
      getClass: jest.fn().mockReturnValue(class {}),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: { authorization: 'Bearer valid-token' },
        }),
        getResponse: jest.fn().mockReturnValue({}),
        getNext: jest.fn(),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getArgs: jest.fn().mockReturnValue([]),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate - public routes', () => {
    it('should return true for public routes', () => {
      const context = createMockContext();
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should call reflector with correct parameters for public routes', () => {
      const context = createMockContext();
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        expect.arrayContaining([context.getHandler(), context.getClass()]),
      );
    });
  });

  describe('handleRequest', () => {
    it('should return user if authentication is successful', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'MEMBER',
      };

      const result = guard.handleRequest(null, mockUser, null);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user is not provided', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, null)).toThrow('Authentication required');
    });

    it('should throw error if err is provided', () => {
      const error = new Error('Token expired');

      expect(() => guard.handleRequest(error, null, null)).toThrow(error);
    });

    it('should prioritize error over missing user', () => {
      const error = new Error('Invalid token');

      expect(() => guard.handleRequest(error, null, null)).toThrow(error);
    });

    it('should throw UnauthorizedException with info parameter', () => {
      const info = { message: 'Token expired' };

      expect(() => guard.handleRequest(null, null, info)).toThrow(UnauthorizedException);
    });

    it('should return user even with info provided', () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const info = { message: 'Some info' };

      const result = guard.handleRequest(null, mockUser, info);

      expect(result).toEqual(mockUser);
    });

    it('should handle user with all properties', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
      };

      const result = guard.handleRequest(null, mockUser, null);

      expect(result).toEqual(mockUser);
    });

    it('should throw original error type when error is provided', () => {
      const customError = new UnauthorizedException('Custom error');

      expect(() => guard.handleRequest(customError, null, null)).toThrow(customError);
    });
  });

  describe('Edge cases', () => {
    it('should return user with minimal properties', () => {
      const minimalUser = { id: 'user-123' };

      const result = guard.handleRequest(null, minimalUser, null);

      expect(result).toEqual(minimalUser);
    });

    it('should handle empty object as user', () => {
      const emptyUser = {};

      // Empty object is truthy, so it should be returned
      const result = guard.handleRequest(null, emptyUser, null);

      expect(result).toEqual(emptyUser);
    });

    it('should throw UnauthorizedException for false as user', () => {
      expect(() => guard.handleRequest(null, false as any, null)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for undefined user', () => {
      expect(() => guard.handleRequest(null, undefined, null)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for 0 as user', () => {
      expect(() => guard.handleRequest(null, 0 as any, null)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for empty string as user', () => {
      expect(() => guard.handleRequest(null, '' as any, null)).toThrow(UnauthorizedException);
    });
  });

  describe('Reflector metadata checks', () => {
    it('should check isPublic metadata using getAllAndOverride', () => {
      const context = createMockContext();
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should pass handler and class to reflector in correct order', () => {
      const context = createMockContext();
      const mockHandler = jest.fn();
      const mockClass = class MockClass {};
      (context.getHandler as jest.Mock).mockReturnValue(mockHandler);
      (context.getClass as jest.Mock).mockReturnValue(mockClass);
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockHandler,
        mockClass,
      ]);
    });
  });
});
