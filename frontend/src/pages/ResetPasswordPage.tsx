import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store';
import { useResetPassword } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { Button, Input, Alert } from '@/components/common';

/**
 * Reset Password Page - Supabase Edition
 *
 * Supabaseはパスワードリセット時にURLのハッシュフラグメントでトークンを渡す。
 * 例: /reset-password#access_token=xxx&type=recovery
 *
 * Supabaseクライアントが自動的にセッションを確立するので、
 * このページではセッションの有無を確認して処理を行う。
 */

export function ResetPasswordPage() {
  const { isAuthenticated } = useAuthStore();

  const { mutate: resetPassword, isPending, isSuccess, error } = useResetPassword();

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  // Supabaseのパスワードリセットセッションを確認
  useEffect(() => {
    const checkSession = async () => {
      // URLハッシュにrecoveryトークンがあるか確認
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');

      if (type === 'recovery') {
        // Supabaseが自動的にセッションを設定するのを監視
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' && session) {
            setIsValidSession(true);
          }
        });

        // 少し待ってからセッションを確認
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setIsValidSession(true);
          } else {
            setIsValidSession(false);
          }
          subscription.unsubscribe();
        }, 1000);
      } else {
        // recoveryタイプでない場合は無効
        setIsValidSession(false);
      }
    };

    checkSession();
  }, []);

  // 既にログイン中の場合はリダイレクト（ただしリセットフロー中は除く）
  // isValidSessionがnull（未判定）の場合はリダイレクトしない
  if (isAuthenticated && isValidSession === false) {
    return <Navigate to="/today" replace />;
  }

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    // Password validation
    if (!formData.newPassword) {
      errors.newPassword = 'パスワードを入力してください';
    } else if (formData.newPassword.length < 8) {
      errors.newPassword = 'パスワードは8文字以上で入力してください';
    } else if (formData.newPassword.length > 50) {
      errors.newPassword = 'パスワードは50文字以内で入力してください';
    } else {
      // 4条件のうち2つ以上を満たすかチェック
      const conditions = [
        /[a-z]/.test(formData.newPassword), // 小文字
        /[A-Z]/.test(formData.newPassword), // 大文字
        /\d/.test(formData.newPassword),    // 数字
        /[@$!%*?&#^()_+\-=\[\]{}|;:'",.<>?/\\`~]/.test(formData.newPassword) // 特殊文字
      ];
      const conditionsMet = conditions.filter(Boolean).length;
      if (conditionsMet < 2) {
        errors.newPassword =
          'パスワードは大文字、小文字、数字、特殊文字のうち2種類以上を含めてください';
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = '確認用パスワードを入力してください';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'パスワードが一致しません';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    resetPassword({
      newPassword: formData.newPassword,
    });
  };

  const handleChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      if (validationErrors[field]) {
        setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  // Success state
  if (isSuccess) {
    return (
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden w-1/2 bg-primary-600 lg:flex lg:flex-col lg:justify-center lg:px-12">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white">Partner Hub</h1>
            <p className="mt-4 text-lg text-primary-100">
              パートナー協業を効率化し、プロジェクトの成功を支援するプラットフォーム
            </p>
          </div>
        </div>

        {/* Right side - Success message */}
        <div className="flex w-full flex-col justify-center px-6 lg:w-1/2 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <h1 className="text-2xl font-bold text-primary-600">Partner Hub</h1>
            </div>

            <div className="rounded-lg bg-green-50 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                パスワードを再設定しました
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                新しいパスワードでログインしてください。
              </p>
            </div>

            <Link
              to="/login"
              className="mt-6 flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              ログイン画面へ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isValidSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">確認中...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!isValidSession) {
    return (
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden w-1/2 bg-primary-600 lg:flex lg:flex-col lg:justify-center lg:px-12">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white">Partner Hub</h1>
            <p className="mt-4 text-lg text-primary-100">
              パートナー協業を効率化し、プロジェクトの成功を支援するプラットフォーム
            </p>
          </div>
        </div>

        {/* Right side - Invalid token message */}
        <div className="flex w-full flex-col justify-center px-6 lg:w-1/2 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <h1 className="text-2xl font-bold text-primary-600">Partner Hub</h1>
            </div>

            <div className="rounded-lg bg-red-50 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <KeyRound className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                リンクが無効です
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                パスワードリセットのリンクが無効または期限切れです。
                <br />
                もう一度お試しください。
              </p>
            </div>

            <Link
              to="/forgot-password"
              className="mt-6 flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              パスワードリセットを再度リクエスト
            </Link>

            <Link
              to="/login"
              className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              <ArrowLeft className="h-4 w-4" />
              ログイン画面に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 bg-primary-600 lg:flex lg:flex-col lg:justify-center lg:px-12">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-white">Partner Hub</h1>
          <p className="mt-4 text-lg text-primary-100">
            パートナー協業を効率化し、プロジェクトの成功を支援するプラットフォーム
          </p>
        </div>
      </div>

      {/* Right side - Reset password form */}
      <div className="flex w-full flex-col justify-center px-6 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <h1 className="text-2xl font-bold text-primary-600">Partner Hub</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              新しいパスワードを設定
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              新しいパスワードを入力してください。
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mt-6">
              {error instanceof Error ? error.message : 'エラーが発生しました'}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <Input
              label="新しいパスワード"
              type={showPassword ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange('newPassword')}
              error={validationErrors.newPassword}
              placeholder="8文字以上"
              autoComplete="new-password"
              required
              helperText="8文字以上、大文字・小文字・数字・記号のうち2種類以上"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            <Input
              label="新しいパスワード（確認）"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={validationErrors.confirmPassword}
              placeholder="パスワードを再入力"
              autoComplete="new-password"
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label={
                    showConfirmPassword ? 'パスワードを隠す' : 'パスワードを表示'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            <Button
              type="submit"
              fullWidth
              isLoading={isPending}
              leftIcon={<KeyRound className="h-4 w-4" />}
            >
              パスワードを再設定
            </Button>
          </form>

          <Link
            to="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            <ArrowLeft className="h-4 w-4" />
            ログイン画面に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
