import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store';
import { useResetPassword, useValidateResetToken } from '@/hooks';
import { Button, Input, Alert } from '@/components/common';

export function ResetPasswordPage() {
  const { isAuthenticated } = useAuthStore();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const { mutate: resetPassword, isPending, isSuccess, error } = useResetPassword();
  const {
    data: tokenValidation,
    isLoading: isValidating,
  } = useValidateResetToken(token);

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

  if (isAuthenticated) {
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
    } else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/.test(
        formData.newPassword
      )
    ) {
      errors.newPassword =
        'パスワードは大文字、小文字、数字、特殊文字(@$!%*?&)を含める必要があります';
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
      token,
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
  if (isValidating) {
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
  if (!token || (tokenValidation && !tokenValidation.valid)) {
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
              placeholder="8文字以上（大小英字・数字・記号を含む）"
              autoComplete="new-password"
              required
              helperText="大文字、小文字、数字、特殊文字(@$!%*?&)を含む8文字以上"
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
