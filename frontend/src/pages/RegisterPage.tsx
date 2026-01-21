import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store';
import { useRegister } from '@/hooks';
import { Button, Input, Alert } from '@/components/common';

export function RegisterPage() {
  const { isAuthenticated, error, isLoading } = useAuthStore();
  const { mutate: register } = useRegister();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    firstName?: string;
    lastName?: string;
  }>({});

  if (isAuthenticated) {
    return <Navigate to="/today" replace />;
  }

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    // First name validation
    if (!formData.firstName.trim()) {
      errors.firstName = '姓を入力してください';
    } else if (formData.firstName.length > 50) {
      errors.firstName = '姓は50文字以内で入力してください';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      errors.lastName = '名を入力してください';
    } else if (formData.lastName.length > 50) {
      errors.lastName = '名は50文字以内で入力してください';
    }

    // Email validation
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      errors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = '有効なメールアドレスを入力してください';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 8) {
      errors.password = 'パスワードは8文字以上で入力してください';
    } else if (formData.password.length > 50) {
      errors.password = 'パスワードは50文字以内で入力してください';
    } else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/.test(
        formData.password
      )
    ) {
      errors.password =
        'パスワードは大文字、小文字、数字、特殊文字(@$!%*?&)を含める必要があります';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = '確認用パスワードを入力してください';
    } else if (formData.password !== formData.confirmPassword) {
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

    register({
      email: formData.email.trim(),
      password: formData.password,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
    });
  };

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 bg-primary-600 lg:flex lg:flex-col lg:justify-center lg:px-12">
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

      {/* Right side - Register form */}
      <div className="flex w-full flex-col justify-center px-6 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <h1 className="text-2xl font-bold text-primary-600">Partner Hub</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">新規登録</h2>
            <p className="mt-2 text-sm text-gray-600">
              アカウント情報を入力して登録してください
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mt-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="姓"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange('firstName')}
                error={validationErrors.firstName}
                placeholder="山田"
                autoComplete="family-name"
                required
              />

              <Input
                label="名"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange('lastName')}
                error={validationErrors.lastName}
                placeholder="太郎"
                autoComplete="given-name"
                required
              />
            </div>

            <Input
              label="メールアドレス"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange('email')}
              error={validationErrors.email}
              placeholder="example@company.com"
              autoComplete="email"
              required
            />

            <Input
              label="パスワード"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange('password')}
              error={validationErrors.password}
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
              label="パスワード（確認）"
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
              isLoading={isLoading}
              leftIcon={<UserPlus className="h-4 w-4" />}
            >
              登録する
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            既にアカウントをお持ちですか？{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
