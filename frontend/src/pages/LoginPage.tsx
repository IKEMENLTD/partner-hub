import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store';
import { useLogin } from '@/hooks';
import { Button, Input, Alert } from '@/components/common';

export function LoginPage() {
  const { isAuthenticated, error, isLoading } = useAuthStore();
  const { mutate: login } = useLogin();

  // 注意: リカバリーモードフラグはログイン実行時(useLogin)でクリアされる
  // ページマウント時にクリアすると、別タブでフラグがクリアされてしまう脆弱性がある

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  if (isAuthenticated) {
    return <Navigate to="/today" replace />;
  }

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    // Trim and validate email
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = '有効なメールアドレスを入力してください';
    }

    // Validate password (minimum 8 characters to match backend validation)
    if (!password) {
      errors.password = 'パスワードを入力してください';
    } else if (password.length < 8) {
      errors.password = 'パスワードは8文字以上で入力してください';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Send trimmed email to backend
    login({ email: email.trim(), password });
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden md:flex md:w-2/5 lg:w-1/2 bg-primary-600 md:flex-col md:justify-center md:px-8 lg:px-12">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-white">Partner Hub</h1>
          <p className="mt-4 text-lg text-primary-100">
            パートナー協業を効率化し、プロジェクトの成功を支援するプラットフォーム
          </p>
          <ul className="mt-8 space-y-4">
            <li className="flex items-center gap-3 text-primary-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              案件管理とタスク追跡
            </li>
            <li className="flex items-center gap-3 text-primary-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              パートナー情報の一元管理
            </li>
            <li className="flex items-center gap-3 text-primary-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              リアルタイムな進捗確認
            </li>
          </ul>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full flex-col justify-center px-4 xs:px-6 sm:px-8 lg:px-16 md:w-3/5 lg:w-1/2">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 md:hidden">
            <h1 className="text-2xl font-bold text-primary-600">Partner Hub</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">ログイン</h2>
            <p className="mt-2 text-sm text-gray-600">
              アカウント情報を入力してログインしてください
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mt-6">
              {error}
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
                if (validationErrors.email) {
                  setValidationErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              error={validationErrors.email}
              placeholder="example@company.com"
              autoComplete="email"
              required
            />

            <Input
              label="パスワード"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (validationErrors.password) {
                  setValidationErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              error={validationErrors.password}
              placeholder="パスワードを入力"
              autoComplete="current-password"
              required
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

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-600">
                  ログイン状態を保持
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                パスワードを忘れた方
              </Link>
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              leftIcon={<LogIn className="h-4 w-4" />}
            >
              ログイン
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            アカウントをお持ちでないですか？{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              新規登録
            </Link>
          </p>

          {/* Demo credentials hint - only show in development */}
          {import.meta.env.MODE === 'development' && (
            <div className="mt-8 rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-700">デモ用アカウント</p>
              <p className="mt-1 text-xs text-gray-500">
                Email: demo@example.com / Password: Demo1234!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
