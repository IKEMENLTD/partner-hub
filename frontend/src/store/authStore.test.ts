import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useAuthStore.getState();
    store.logout();
  });

  describe('Initial State', () => {
    it('should have initial state', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('login action', () => {
    it('should set user and token on login', () => {
      const store = useAuthStore.getState();
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'MEMBER' as const,
      };
      const mockToken = 'test-token';

      store.login(mockUser, mockToken);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockToken);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should clear error on successful login', () => {
      const store = useAuthStore.getState();

      // Set an error first
      store.setError('Login failed');
      expect(useAuthStore.getState().error).toBe('Login failed');

      // Then login
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'MEMBER' as const,
      };
      store.login(mockUser, 'token');

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });

    it('should handle login with different user roles', () => {
      const store = useAuthStore.getState();
      const roles = ['ADMIN', 'MANAGER', 'MEMBER', 'PARTNER'] as const;

      roles.forEach((role) => {
        store.logout(); // Reset between tests

        const mockUser = {
          id: `user-${role}`,
          email: `${role.toLowerCase()}@example.com`,
          firstName: 'Test',
          lastName: role,
          role,
        };

        store.login(mockUser, 'token');

        const state = useAuthStore.getState();
        expect(state.user?.role).toBe(role);
        expect(state.isAuthenticated).toBe(true);
      });
    });
  });

  describe('logout action', () => {
    it('should clear user and token on logout', () => {
      const store = useAuthStore.getState();
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'MEMBER' as const,
      };

      // Login first
      store.login(mockUser, 'token');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Then logout
      store.logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should clear error on logout', () => {
      const store = useAuthStore.getState();

      store.setError('Some error');
      expect(useAuthStore.getState().error).toBe('Some error');

      store.logout();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('setLoading action', () => {
    it('should set loading to true', () => {
      const store = useAuthStore.getState();

      store.setLoading(true);

      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('should set loading to false', () => {
      const store = useAuthStore.getState();

      store.setLoading(true);
      store.setLoading(false);

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError action', () => {
    it('should set error message', () => {
      const store = useAuthStore.getState();
      const errorMessage = 'Login failed';

      store.setError(errorMessage);

      expect(useAuthStore.getState().error).toBe(errorMessage);
    });

    it('should clear error when set to null', () => {
      const store = useAuthStore.getState();

      store.setError('Some error');
      expect(useAuthStore.getState().error).toBe('Some error');

      store.setError(null);

      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should handle empty string as error', () => {
      const store = useAuthStore.getState();

      store.setError('');

      expect(useAuthStore.getState().error).toBe('');
    });
  });

  describe('updateUser action', () => {
    it('should update user fields', () => {
      const store = useAuthStore.getState();
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'MEMBER' as const,
      };

      store.login(mockUser, 'token');

      store.updateUser({
        firstName: 'Updated',
        lastName: 'Name',
      });

      const state = useAuthStore.getState();
      expect(state.user?.firstName).toBe('Updated');
      expect(state.user?.lastName).toBe('Name');
      expect(state.user?.email).toBe('test@example.com'); // Should not change
    });

    it('should not update user if user is null', () => {
      const store = useAuthStore.getState();

      store.updateUser({
        firstName: 'Updated',
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should handle partial updates', () => {
      const store = useAuthStore.getState();
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'MEMBER' as const,
      };

      store.login(mockUser, 'token');

      store.updateUser({ firstName: 'NewFirst' });

      const state = useAuthStore.getState();
      expect(state.user?.firstName).toBe('NewFirst');
      expect(state.user?.lastName).toBe('User'); // Should remain unchanged
    });
  });

  describe('Persistence', () => {
    it('should persist authentication state', () => {
      const store = useAuthStore.getState();
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'MEMBER' as const,
      };

      store.login(mockUser, 'token');

      // The persist middleware should save to localStorage
      // Note: In a real test, you might need to mock localStorage
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('token');
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid login/logout cycles', () => {
      const store = useAuthStore.getState();
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'MEMBER' as const,
      };

      for (let i = 0; i < 5; i++) {
        store.login(mockUser, 'token');
        expect(useAuthStore.getState().isAuthenticated).toBe(true);

        store.logout();
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
      }
    });

    it('should handle logging in while already logged in', () => {
      const store = useAuthStore.getState();
      const user1 = {
        id: 'user-1',
        email: 'user1@example.com',
        firstName: 'User',
        lastName: 'One',
        role: 'MEMBER' as const,
      };
      const user2 = {
        id: 'user-2',
        email: 'user2@example.com',
        firstName: 'User',
        lastName: 'Two',
        role: 'ADMIN' as const,
      };

      store.login(user1, 'token1');
      expect(useAuthStore.getState().user?.id).toBe('user-1');

      store.login(user2, 'token2');

      const state = useAuthStore.getState();
      expect(state.user?.id).toBe('user-2');
      expect(state.token).toBe('token2');
    });

    it('should handle empty token', () => {
      const store = useAuthStore.getState();
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'MEMBER' as const,
      };

      store.login(mockUser, '');

      const state = useAuthStore.getState();
      expect(state.token).toBe('');
      expect(state.isAuthenticated).toBe(true); // Still authenticated
    });

    it('should handle very long error messages', () => {
      const store = useAuthStore.getState();
      const longError = 'Error: ' + 'a'.repeat(1000);

      store.setError(longError);

      expect(useAuthStore.getState().error).toBe(longError);
    });
  });

  describe('State Selectors', () => {
    it('should allow selecting specific state slices', () => {
      const state = useAuthStore.getState();
      const isAuthenticated = state.isAuthenticated;
      const isLoading = state.isLoading;

      expect(typeof isAuthenticated).toBe('boolean');
      expect(typeof isLoading).toBe('boolean');
    });
  });
});
