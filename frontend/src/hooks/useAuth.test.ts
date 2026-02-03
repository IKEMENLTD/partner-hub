import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock modules before importing hooks
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
  isSupabaseConfigured: true,
}));

vi.mock('@/services/authService', () => ({
  authService: {
    getCurrentUser: vi.fn(),
  },
}));

// Create a mutable mock state that can be modified in tests
const createMockState = (overrides = {}) => ({
  session: null,
  user: null,
  isLoading: false,
  error: null,
  setSession: vi.fn(),
  setUser: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  setInitialized: vi.fn(),
  logout: vi.fn(),
  ...overrides,
});

let mockAuthState = createMockState();

vi.mock('@/store', () => ({
  useAuthStore: vi.fn((selector) => {
    return selector ? selector(mockAuthState) : mockAuthState;
  }),
}));

import {
  useLogin,
  useLogout,
  useRegister,
  useForgotPassword,
  useResetPassword,
  useSession,
  useAccessToken,
} from './useAuth';
import { supabase } from '@/lib/supabase';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useAuth hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset mock state before each test
    mockAuthState = createMockState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useLogin', () => {
    it('should call signInWithPassword with correct credentials', async () => {
      const mockData = {
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'token' },
      };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: mockData,
        error: null,
      } as any);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should trim email before login', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: {}, session: {} },
        error: null,
      } as any);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          email: '  test@example.com  ',
          password: 'password123',
        });
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should clear recovery mode flag on login', async () => {
      localStorage.setItem('password_recovery_mode', 'true');

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: {}, session: {} },
        error: null,
      } as any);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(localStorage.getItem('password_recovery_mode')).toBeNull();
    });

    it('should handle login error', async () => {
      const mockError = { message: 'Invalid login credentials' };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError,
      } as any);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            email: 'test@example.com',
            password: 'wrong',
          });
        })
      ).rejects.toEqual(mockError);
    });

    it('should handle email not confirmed error', async () => {
      const mockError = { message: 'Email not confirmed' };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError,
      } as any);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            email: 'test@example.com',
            password: 'password',
          });
        })
      ).rejects.toEqual(mockError);
    });

    it('should handle rate limit error', async () => {
      const mockError = {
        message: 'For security purposes, you can only request this after 60 seconds',
      };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError,
      } as any);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            email: 'test@example.com',
            password: 'password',
          });
        })
      ).rejects.toEqual(mockError);
    });
  });

  describe('useRegister', () => {
    it('should call signUp with correct data', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: { id: 'new-user' }, session: null },
        error: null,
      } as any);

      const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          email: 'new@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        });
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'Test',
            last_name: 'User',
          },
          emailRedirectTo: expect.stringContaining('/login'),
        },
      });
    });

    it('should trim email and names', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: {}, session: null },
        error: null,
      } as any);

      const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          email: '  new@example.com  ',
          password: 'password123',
          firstName: '  Test  ',
          lastName: '  User  ',
        });
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'Test',
            last_name: 'User',
          },
          emailRedirectTo: expect.any(String),
        },
      });
    });

    it('should handle already registered error', async () => {
      const mockError = { message: 'User already registered' };
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError,
      } as any);

      const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            email: 'existing@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
          });
        })
      ).rejects.toEqual(mockError);
    });

    it('should handle weak password error', async () => {
      const mockError = { message: 'Password should be at least 6 characters' };
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError,
      } as any);

      const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            email: 'new@example.com',
            password: '123',
            firstName: 'Test',
            lastName: 'User',
          });
        })
      ).rejects.toEqual(mockError);
    });

    it('should handle invalid email format error', async () => {
      const mockError = { message: 'Unable to validate email address: invalid format' };
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError,
      } as any);

      const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            email: 'invalid-email',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
          });
        })
      ).rejects.toEqual(mockError);
    });
  });

  describe('useLogout', () => {
    it('should call signOut', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: null,
      } as any);

      // Mock window.location
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });

      const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'global' });

      // Restore window.location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('should clear recovery mode flag on logout', async () => {
      localStorage.setItem('password_recovery_mode', 'true');

      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: null,
      } as any);

      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });

      const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(localStorage.getItem('password_recovery_mode')).toBeNull();

      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('should logout and redirect on error', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: new Error('Network error'),
      } as any);

      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });

      const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch {
          // Expected to throw but still logout
        }
      });

      expect(window.location.href).toBe('/login');

      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });
  });

  describe('useForgotPassword', () => {
    it('should call resetPasswordForEmail with correct email', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
        data: {},
        error: null,
      } as any);

      const { result } = renderHook(() => useForgotPassword(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ email: 'test@example.com' });
      });

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: expect.stringContaining('/reset-password') }
      );
    });

    it('should trim email', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
        data: {},
        error: null,
      } as any);

      const { result } = renderHook(() => useForgotPassword(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ email: '  test@example.com  ' });
      });

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(Object)
      );
    });

    it('should handle email rate limit error', async () => {
      const mockError = { message: 'Email rate limit exceeded' };
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
        data: {},
        error: mockError,
      } as any);

      const { result } = renderHook(() => useForgotPassword(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({ email: 'test@example.com' });
        })
      ).rejects.toEqual(mockError);
    });
  });

  describe('useResetPassword', () => {
    it('should call updateUser with new password', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
        data: { user: {} },
        error: null,
      } as any);
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: null,
      } as any);

      const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ newPassword: 'newPassword123' });
      });

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newPassword123',
      });
    });

    it('should clear recovery mode flag', async () => {
      localStorage.setItem('password_recovery_mode', 'true');

      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
        data: { user: {} },
        error: null,
      } as any);
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: null,
      } as any);

      const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ newPassword: 'newPassword123' });
      });

      expect(localStorage.getItem('password_recovery_mode')).toBeNull();
    });

    it('should sign out after password reset', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
        data: { user: {} },
        error: null,
      } as any);
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: null,
      } as any);

      const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ newPassword: 'newPassword123' });
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle same password error', async () => {
      const mockError = { message: 'New password should be different from the old password.' };
      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
        data: { user: null },
        error: mockError,
      } as any);

      const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({ newPassword: 'samePassword' });
        })
      ).rejects.toEqual(mockError);
    });
  });

  describe('useSession', () => {
    it('should return session from store', () => {
      const mockSession = { access_token: 'test-token' };

      // Update mock state for this test
      mockAuthState = createMockState({ session: mockSession });

      const { result } = renderHook(() => useSession());

      expect(result.current).toEqual(mockSession);
    });

    it('should return null when no session', () => {
      mockAuthState = createMockState({ session: null });

      const { result } = renderHook(() => useSession());

      expect(result.current).toBeNull();
    });
  });

  describe('useAccessToken', () => {
    it('should return access token from session', () => {
      mockAuthState = createMockState({ session: { access_token: 'my-token' } });

      const { result } = renderHook(() => useAccessToken());

      expect(result.current).toBe('my-token');
    });

    it('should return null when no session', () => {
      mockAuthState = createMockState({ session: null });

      const { result } = renderHook(() => useAccessToken());

      expect(result.current).toBeNull();
    });

    it('should return null when session has no access_token', () => {
      mockAuthState = createMockState({ session: {} });

      const { result } = renderHook(() => useAccessToken());

      expect(result.current).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty email in login', async () => {
      const mockError = { message: 'Unable to validate email address: invalid format' };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError,
      } as any);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            email: '',
            password: 'password123',
          });
        })
      ).rejects.toEqual(mockError);
    });

    it('should handle empty password in login', async () => {
      const mockError = { message: 'Invalid login credentials' };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockError,
      } as any);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            email: 'test@example.com',
            password: '',
          });
        })
      ).rejects.toEqual(mockError);
    });

    it('should handle whitespace-only names in register', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: {}, session: null },
        error: null,
      } as any);

      const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          email: 'test@example.com',
          password: 'password123',
          firstName: '   ',
          lastName: '   ',
        });
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: '',
            last_name: '',
          },
          emailRedirectTo: expect.any(String),
        },
      });
    });
  });

  describe('Boundary values', () => {
    it('should handle very long email', async () => {
      const longEmail = 'a'.repeat(200) + '@example.com';
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: {}, session: {} },
        error: null,
      } as any);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          email: longEmail,
          password: 'password123',
        });
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: longEmail,
        password: 'password123',
      });
    });

    it('should handle very long password', async () => {
      const longPassword = 'a'.repeat(500);
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: {}, session: {} },
        error: null,
      } as any);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          email: 'test@example.com',
          password: longPassword,
        });
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: longPassword,
      });
    });

    it('should handle unicode characters in names', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: {}, session: null },
        error: null,
      } as any);

      const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          email: 'test@example.com',
          password: 'password123',
          firstName: '太郎',
          lastName: '山田',
        });
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: '太郎',
            last_name: '山田',
          },
          emailRedirectTo: expect.any(String),
        },
      });
    });

    it('should handle special characters in password', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: {}, session: {} },
        error: null,
      } as any);

      const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          email: 'test@example.com',
          password: specialPassword,
        });
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: specialPassword,
      });
    });
  });
});
