import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';

/**
 * SECURITY NOTE: Token Storage Considerations
 *
 * This implementation uses sessionStorage instead of localStorage for improved security:
 * - sessionStorage is cleared when the browser tab is closed
 * - Reduces the window of opportunity for XSS attacks to steal tokens
 * - For production, consider using httpOnly cookies with the server
 *
 * Additional security measures:
 * - Token should have short expiration (15 minutes)
 * - Implement token refresh mechanism
 * - Consider implementing CSRF protection if using cookies
 */

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  updateUser: (user: Partial<User>) => void;
  updateTokens: (token: string, refreshToken?: string) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // State
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: (user, token, refreshToken) =>
        set({
          user,
          token,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
          error: null,
        }),

      logout: () => {
        // SECURITY FIX: Clear all storage on logout
        sessionStorage.removeItem('auth-storage');
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      updateTokens: (token, refreshToken) =>
        set((state) => ({
          token,
          refreshToken: refreshToken || state.refreshToken,
        })),
    }),
    {
      name: 'auth-storage',
      // SECURITY FIX: Use sessionStorage instead of localStorage
      // sessionStorage is cleared when browser tab is closed, reducing XSS risk
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
