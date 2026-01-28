import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/store';
import { authService } from '@/services/authService';
import type { AuthError } from '@supabase/supabase-js';
import type { User } from '@/types';

/**
 * Auth Hooks - Supabase Edition
 *
 * 認証処理はSupabase Auth APIを直接使用。
 * バックエンドへのAPI呼び出しは不要。
 */

// エラーメッセージを日本語に変換
function getErrorMessage(error: AuthError): string {
  const message = error.message || '';

  // Rate limit error (dynamic seconds)
  const rateLimitMatch = message.match(/For security purposes, you can only request this after (\d+) seconds/);
  if (rateLimitMatch) {
    return `セキュリティのため、${rateLimitMatch[1]}秒後に再試行してください`;
  }

  switch (message) {
    case 'Invalid login credentials':
      return 'メールアドレスまたはパスワードが正しくありません';
    case 'Email not confirmed':
      return 'メールアドレスが確認されていません。メールをご確認ください';
    case 'User already registered':
      return 'このメールアドレスは既に登録されています';
    case 'Password should be at least 6 characters':
      return 'パスワードは6文字以上で入力してください';
    case 'Unable to validate email address: invalid format':
      return '有効なメールアドレスを入力してください';
    case 'New password should be different from the old password.':
      return '新しいパスワードは現在のパスワードと異なる必要があります';
    case 'Email rate limit exceeded':
      return 'メール送信の制限に達しました。しばらくしてから再試行してください';
    default:
      return message || '認証エラーが発生しました';
  }
}

// バックエンドからプロファイルを取得してユーザー情報を更新
async function fetchAndSetUserProfile(
  setUser: (user: User | null) => void,
  fallbackUser: { id: string; email: string; createdAt: string }
) {
  try {
    const response = await authService.getCurrentUser();
    if (response.data) {
      const profile = response.data;
      setUser({
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        role: profile.role || 'member',
        isActive: profile.isActive ?? true,
        createdAt: profile.createdAt || fallbackUser.createdAt,
      });
    }
  } catch (error) {
    console.error('Failed to fetch user profile from backend:', error);
    // フォールバック: Supabaseの情報を使用（roleはmemberになる）
    setUser({
      id: fallbackUser.id,
      email: fallbackUser.email,
      firstName: '',
      lastName: '',
      role: 'member',
      isActive: true,
      createdAt: fallbackUser.createdAt,
    });
  }
}

// 認証状態の初期化・監視
export function useAuthListener() {
  const { setSession, setUser, setInitialized, setLoading } = useAuthStore();

  useEffect(() => {
    // Supabaseが設定されていない場合は即座に初期化完了
    if (!isSupabaseConfigured) {
      console.error('Supabase is not configured. Authentication disabled.');
      setInitialized(true);
      return;
    }

    let isMounted = true;
    let isInitialized = false;

    const markInitialized = () => {
      if (!isInitialized && isMounted) {
        isInitialized = true;
        setInitialized(true);
      }
    };

    // onAuthStateChangeをメインの初期化手段として使用
    // INITIAL_SESSIONイベントで既存セッションを取得
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        // PASSWORD_RECOVERYイベントを検知したらフラグを設定
        if (event === 'PASSWORD_RECOVERY') {
          sessionStorage.setItem('password_recovery_mode', 'true');
          // リカバリーモード中はセッションを設定しない
          markInitialized();
          return;
        }

        // ログアウト時はリカバリーモードフラグをクリア
        if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem('password_recovery_mode');
        }

        // リカバリーモード中はセッションを設定しない（ただしログアウトは除く）
        const isInRecoveryMode = sessionStorage.getItem('password_recovery_mode') === 'true';
        if (isInRecoveryMode && event !== 'SIGNED_OUT') {
          markInitialized();
          return;
        }

        setSession(session);

        if (session?.user) {
          // バックエンドからプロファイル（role含む）を取得
          await fetchAndSetUserProfile(setUser, {
            id: session.user.id,
            email: session.user.email || '',
            createdAt: session.user.created_at,
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }

        // INITIAL_SESSION または SIGNED_IN/SIGNED_OUT で初期化完了
        markInitialized();
      }
    );

    // フォールバック: 5秒後にも初期化されていなければ強制的に初期化完了
    const fallbackTimer = setTimeout(() => {
      if (!isInitialized) {
        console.warn('Auth initialization fallback triggered');
        markInitialized();
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, [setSession, setUser, setInitialized, setLoading]);
}

// ログイン入力型
interface LoginInput {
  email: string;
  password: string;
}

export function useLogin() {
  const { setLoading, setError } = useAuthStore();

  return useMutation({
    mutationFn: async ({ email, password }: LoginInput) => {
      if (!isSupabaseConfigured) {
        throw new Error('認証システムが設定されていません');
      }

      // ログイン前にリカバリーモードフラグをクリア
      sessionStorage.removeItem('password_recovery_mode');

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      return data;
    },
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onError: (error: AuthError) => {
      setError(getErrorMessage(error));
    },
    onSettled: () => {
      setLoading(false);
    },
  });
}

// 新規登録入力型
interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export function useRegister() {
  const { setLoading, setError } = useAuthStore();

  return useMutation({
    mutationFn: async ({ email, password, firstName, lastName }: RegisterInput) => {
      if (!isSupabaseConfigured) {
        throw new Error('認証システムが設定されていません');
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) throw error;
      return data;
    },
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onError: (error: AuthError) => {
      setError(getErrorMessage(error));
    },
    onSettled: () => {
      setLoading(false);
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      if (!isSupabaseConfigured) {
        // Supabaseが設定されていなくてもローカル状態はクリア
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      logout();
    },
    onError: () => {
      // APIエラーでも強制的にログアウト
      logout();
    },
  });
}

// パスワードリセットメール送信
interface ForgotPasswordInput {
  email: string;
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async ({ email }: ForgotPasswordInput) => {
      if (!isSupabaseConfigured) {
        throw new Error('認証システムが設定されていません');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    },
    onError: (error: AuthError) => {
      console.error('Forgot password error:', getErrorMessage(error));
    },
  });
}

// パスワード更新（リセット後）
interface ResetPasswordInput {
  newPassword: string;
}

export function useResetPassword() {
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async ({ newPassword }: ResetPasswordInput) => {
      if (!isSupabaseConfigured) {
        throw new Error('認証システムが設定されていません');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // リカバリーモードフラグをクリア
      sessionStorage.removeItem('password_recovery_mode');

      // パスワード更新後、セッションをクリアして再ログインを要求
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      logout();
    },
    onError: (error: AuthError) => {
      console.error('Reset password error:', getErrorMessage(error));
    },
  });
}

// 現在のセッションを取得
export function useSession() {
  return useAuthStore((state) => state.session);
}

// アクセストークンを取得（API呼び出し用）
export function useAccessToken() {
  const session = useAuthStore((state) => state.session);
  return session?.access_token ?? null;
}
