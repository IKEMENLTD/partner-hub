import { create } from 'zustand';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '@/types';

/**
 * Auth Store - Supabase Edition
 *
 * Supabaseがセッション管理を行うため、トークンの永続化は不要。
 * Supabaseクライアントが自動的にsessionStorageを管理する。
 */

interface AuthState {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string | null) => void;
  updateUser: (user: Partial<User>) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()((set) => ({
  // State
  user: null,
  supabaseUser: null,
  session: null,
  isAuthenticated: false,
  isLoading: true, // Start true for initialization
  isInitialized: false,
  error: null,

  // Actions
  setSession: (session) =>
    set({
      session,
      supabaseUser: session?.user ?? null,
      isAuthenticated: !!session,
      error: null,
    }),

  setUser: (user) =>
    set({
      user,
    }),

  logout: () =>
    set({
      user: null,
      supabaseUser: null,
      session: null,
      isAuthenticated: false,
      error: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setInitialized: (isInitialized) => set({ isInitialized, isLoading: false }),

  setError: (error) => set({ error }),

  updateUser: (userData) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    })),
}));
