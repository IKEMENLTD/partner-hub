import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store';
import { useForgotPassword } from '@/hooks';
import { Button, Input, Alert } from '@/components/common';

export function ForgotPasswordPage() {
  const { isAuthenticated } = useAuthStore();
  const { mutate: forgotPassword, isPending, isSuccess, error } = useForgotPassword();

  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();

  if (isAuthenticated) {
    return <Navigate to="/today" replace />;
  }

  const validateForm = (): boolean => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setValidationError('メールアドレスを入力してください');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setValidationError('有効なメールアドレスを入力してください');
      return false;
    }
    setValidationError(undefined);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    forgotPassword({ email: email.trim() });
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden md:flex md:w-2/5 lg:w-1/2 bg-primary-600 md:flex-col md:justify-center md:px-8 lg:px-12">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white">Partner Hub</h1>
            <p className="mt-4 text-lg text-primary-100">
              パートナー協業を効率化し、プロジェクトの成功を支援するプラットフォーム
            </p>
          </div>
        </div>

        {/* Right side - Success message */}
        <div className="flex w-full flex-col justify-center px-4 xs:px-6 sm:px-8 lg:px-16 md:w-3/5 lg:w-1/2">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 md:hidden">
              <h1 className="text-2xl font-bold text-primary-600">Partner Hub</h1>
            </div>

            <div className="rounded-lg bg-green-50 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                メールを送信しました
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                パスワードリセットの手順をメールで送信しました。
                <br />
                メールをご確認ください。
              </p>
              <p className="mt-4 text-xs text-gray-500">
                メールが届かない場合は、迷惑メールフォルダをご確認ください。
              </p>
            </div>

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

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden md:flex md:w-2/5 lg:w-1/2 bg-primary-600 md:flex-col md:justify-center md:px-8 lg:px-12">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-white">Partner Hub</h1>
          <p className="mt-4 text-lg text-primary-100">
            パートナー協業を効率化し、プロジェクトの成功を支援するプラットフォーム
          </p>
        </div>
      </div>

      {/* Right side - Forgot password form */}
      <div className="flex w-full flex-col justify-center px-4 xs:px-6 sm:px-8 lg:px-16 md:w-3/5 lg:w-1/2">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <h1 className="text-2xl font-bold text-primary-600">Partner Hub</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              パスワードをお忘れの方
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              登録したメールアドレスを入力してください。
              <br />
              パスワードリセットの手順をメールでお送りします。
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mt-6">
              {error instanceof Error ? error.message : 'エラーが発生しました'}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <Input
              label="メールアドレス"
              type="email"
              name="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationError) {
                  setValidationError(undefined);
                }
              }}
              error={validationError}
              placeholder="example@company.com"
              autoComplete="email"
              required
            />

            <Button
              type="submit"
              fullWidth
              isLoading={isPending}
              leftIcon={<Mail className="h-4 w-4" />}
            >
              リセットメールを送信
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
