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
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(true); // Changed: starts as true for initialization
      expect(state.error).toBeNull();
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('setSession action', () => {
    it('should set session and user on login', () => {
      const store = useAuthStore.getState();
      const mockSupabaseUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          firstName: 'Test',
          lastName: 'User',
        },
        app_metadata: {
          role: 'MEMBER',
        },
      } as any;

      const mockSession = {
        user: mockSupabaseUser,
        access_token: 'test-token',
        refresh_token: 'refresh-token',
      } as any;

      store.setSession(mockSession);

      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
      expect(state.supabaseUser).toEqual(mockSupabaseUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should clear error on successful setSession', () => {
      const store = useAuthStore.getState();

      // Set an error first
      store.setError('Login failed');
      expect(useAuthStore.getState().error).toBe('Login failed');

      // Then set session
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'test-token',
      } as any;

      store.setSession(mockSession);

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('setUser action', () => {
    it('should set user information', () => {
      const store = useAuthStore.getState();
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'MEMBER' as const,
      };

      store.setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
    });

    it('should handle different user roles', () => {
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

        store.setUser(mockUser);

        const state = useAuthStore.getState();
        expect(state.user?.role).toBe(role);
      });
    });

    it('should allow setting user to null', () => {
      const store = useAuthStore.getState();
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'MEMBER' as const,
      };

      store.setUser(mockUser);
      expect(useAuthStore.getState().user).toEqual(mockUser);

      store.setUser(null);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('logout action', () => {
    it('should clear user and session on logout', () => {
      const store = useAuthStore.getState();
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'MEMBER' as const,
      };

      const mockSession = {
        user: { id: 'user-123' },
        access_token: 'test-token',
      } as any;

      // Set session and user first
      store.setSession(mockSession);
      store.setUser(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Then logout
      store.logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.supabaseUser).toBeNull();
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

  describe('setInitialized action', () => {
    it('should set initialized flag and set loading to false', () => {
      const store = useAuthStore.getState();

      store.setLoading(true);
      store.setInitialized(true);

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
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

    it('should handle very long error messages', () => {
      const store = useAuthStore.getState();
      const longError = 'Error: ' + 'a'.repeat(1000);

      store.setError(longError);

      expect(useAuthStore.getState().error).toBe(longError);
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

      store.setUser(mockUser);

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

      store.setUser(mockUser);

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

      const mockSession = {
        user: { id: 'user-123' },
        access_token: 'test-token',
      } as any;

      store.setSession(mockSession);
      store.setUser(mockUser);

      // Supabase handles session persistence automatically
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid setSession/logout cycles', () => {
      const store = useAuthStore.getState();
      const mockSession = {
        user: { id: 'user-123' },
        access_token: 'test-token',
      } as any;

      for (let i = 0; i < 5; i++) {
        store.setSession(mockSession);
        expect(useAuthStore.getState().isAuthenticated).toBe(true);

        store.logout();
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
      }
    });

    it('should handle setting a new session while already authenticated', () => {
      const store = useAuthStore.getState();
      const session1 = {
        user: { id: 'user-1', email: 'user1@example.com' },
        access_token: 'token1',
      } as any;

      const session2 = {
        user: { id: 'user-2', email: 'user2@example.com' },
        access_token: 'token2',
      } as any;

      store.setSession(session1);
      expect(useAuthStore.getState().supabaseUser?.id).toBe('user-1');

      store.setSession(session2);

      const state = useAuthStore.getState();
      expect(state.supabaseUser?.id).toBe('user-2');
      expect(state.session).toEqual(session2);
    });

    it('should handle null session', () => {
      const store = useAuthStore.getState();
      const mockSession = {
        user: { id: 'user-123' },
        access_token: 'test-token',
      } as any;

      store.setSession(mockSession);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      store.setSession(null);

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('State Selectors', () => {
    it('should allow selecting specific state slices', () => {
      const state = useAuthStore.getState();
      const isAuthenticated = state.isAuthenticated;
      const isLoading = state.isLoading;
      const isInitialized = state.isInitialized;

      expect(typeof isAuthenticated).toBe('boolean');
      expect(typeof isLoading).toBe('boolean');
      expect(typeof isInitialized).toBe('boolean');
    });
  });
});
