import { create } from 'zustand';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '@/types';

/**
 * Auth Store - Supabase Edition
 *
 * 状態遷移図:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ [初期状態]                                                          │
 * │   isInitialized: false, isLoading: true                            │
 * │   isAuthenticated: false, isRecoveryMode: false                    │
 * │                           │                                         │
 * │                           v                                         │
 * │                  [認証チェック中]                                    │
 * │                           │                                         │
 * │     ┌─────────────────────┼─────────────────────┐                  │
 * │     │                     │                     │                  │
 * │     v                     v                     v                  │
 * │ [PASSWORD_RECOVERY]   [SIGNED_IN]         [SIGNED_OUT]             │
 * │   isRecoveryMode: true  isAuthenticated: true  isAuthenticated: false│
 * │   isAuthenticated: false isInitialized: true   isInitialized: true │
 * │     │                                                               │
 * │     v                                                               │
 * │ [パスワード更新完了]                                                 │
 * │   1. exitRecoveryMode() → isRecoveryMode: false                    │
 * │   2. logout() → セッションクリア → /login へリダイレクト            │
 * │                                                                     │
 * │ 注意: exitRecoveryMode()単体では認証状態は変更されない             │
 * │       パスワード更新後は必ずlogout()を呼び出すこと                 │
 * └─────────────────────────────────────────────────────────────────────┘
 */

// ============================================
// localStorage操作の一元化
// ============================================
const RECOVERY_MODE_KEY = 'password_recovery_mode';

/**
 * localStorageからリカバリーモードを取得
 * @returns リカバリーモードの状態
 */
export function getRecoveryModeFromStorage(): boolean {
  try {
    return localStorage.getItem(RECOVERY_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * localStorageにリカバリーモードを保存
 * @param value リカバリーモードの状態
 * @returns 保存成功したかどうか
 */
export function setRecoveryModeInStorage(value: boolean): boolean {
  try {
    if (value) {
      localStorage.setItem(RECOVERY_MODE_KEY, 'true');
    } else {
      localStorage.removeItem(RECOVERY_MODE_KEY);
    }
    return true;
  } catch (error) {
    console.error('[AUTH] Failed to persist recovery mode:', error);
    return false;
  }
}

// ============================================
// 状態の型定義（論理的分離）
// ============================================

/** 認証状態 */
interface AuthenticationState {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isAuthenticated: boolean;
}

/** ローディング状態 */
interface LoadingState {
  isLoading: boolean;
  isInitialized: boolean;
}

/** エラー状態 */
interface ErrorState {
  error: string | null;
}

/** リカバリー状態 */
interface RecoveryState {
  isRecoveryMode: boolean;
}

type AuthState = AuthenticationState & LoadingState & ErrorState & RecoveryState;

// ============================================
// アクションの型定義
// ============================================

interface AuthActions {
  // 認証アクション
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;

  // ローディングアクション
  setLoading: (isLoading: boolean) => void;
  setInitialized: (initialized: boolean) => void;

  // エラーアクション
  setError: (error: string | null) => void;
  clearError: () => void;

  // リカバリーアクション
  enterRecoveryMode: () => void;
  exitRecoveryMode: () => void;

  // 複数タブ同期用
  syncRecoveryModeFromStorage: () => void;
}

type AuthStore = AuthState & AuthActions;

// ============================================
// ストア実装
// ============================================

export const useAuthStore = create<AuthStore>()((set, get) => ({
  // ============================================
  // 初期状態
  // ============================================
  user: null,
  supabaseUser: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
  error: null,
  isRecoveryMode: getRecoveryModeFromStorage(),

  // ============================================
  // 認証アクション
  // ============================================
  setSession: (session) => {
    const { isRecoveryMode } = get();

    // セッション失効時かつリカバリーモード中は、リカバリーモードも終了
    if (!session && isRecoveryMode) {
      setRecoveryModeInStorage(false);
      set({
        session: null,
        supabaseUser: null,
        isAuthenticated: false,
        isRecoveryMode: false,
        error: null,
      });
      return;
    }

    set({
      session,
      supabaseUser: session?.user ?? null,
      // リカバリーモード中は認証状態をfalseに保つ
      isAuthenticated: !!session && !isRecoveryMode,
      error: null,
    });
  },

  setUser: (user) => set({ user }),

  updateUser: (userData) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    })),

  logout: () => {
    // ログアウト時はリカバリーモードも終了
    setRecoveryModeInStorage(false);
    set({
      user: null,
      supabaseUser: null,
      session: null,
      isAuthenticated: false,
      isRecoveryMode: false,
      error: null,
    });
  },

  // ============================================
  // ローディングアクション
  // ============================================
  setLoading: (isLoading) => set({ isLoading }),

  setInitialized: (isInitialized) => set({ isInitialized, isLoading: false }),

  // ============================================
  // エラーアクション
  // ============================================
  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  // ============================================
  // リカバリーアクション
  // ============================================
  enterRecoveryMode: () => {
    const success = setRecoveryModeInStorage(true);
    if (!success) {
      console.warn('[AUTH] Recovery mode will only be stored in memory');
    }
    set({
      isRecoveryMode: true,
      isAuthenticated: false,
    });
  },

  exitRecoveryMode: () => {
    const success = setRecoveryModeInStorage(false);
    if (!success) {
      console.warn('[AUTH] Recovery mode exit will only be stored in memory');
    }
    set({ isRecoveryMode: false });
  },

  // ============================================
  // 複数タブ同期
  // ============================================
  syncRecoveryModeFromStorage: () => {
    const storedValue = getRecoveryModeFromStorage();
    const { isRecoveryMode, session } = get();

    if (storedValue !== isRecoveryMode) {
      console.info(`[AUTH] Syncing recovery mode from storage: ${storedValue}`);
      set({
        isRecoveryMode: storedValue,
        // リカバリーモードが解除された場合、セッションがあれば認証状態を更新
        isAuthenticated: !storedValue && !!session,
      });
    }
  },
}));

// ============================================
// 複数タブ同期の初期化
// ============================================
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === RECOVERY_MODE_KEY) {
      useAuthStore.getState().syncRecoveryModeFromStorage();
    }
  });
}

// ============================================
// セレクター（パフォーマンス最適化用）
// ============================================
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;
export const selectIsRecoveryMode = (state: AuthStore) => state.isRecoveryMode;
export const selectIsInitialized = (state: AuthStore) => state.isInitialized;
export const selectIsLoading = (state: AuthStore) => state.isLoading;
export const selectUser = (state: AuthStore) => state.user;
export const selectSession = (state: AuthStore) => state.session;
export const selectAuthError = (state: AuthStore) => state.error;

// ============================================
// 浅い比較用のセレクター（複数値を取得する場合）
// ============================================
export const selectAuthStatus = (state: AuthStore) => ({
  isAuthenticated: state.isAuthenticated,
  isRecoveryMode: state.isRecoveryMode,
  isInitialized: state.isInitialized,
  isLoading: state.isLoading,
});
