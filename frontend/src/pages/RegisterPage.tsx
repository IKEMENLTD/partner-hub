import { useState, useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Building2, Shield } from 'lucide-react';
import { useAuthStore } from '@/store';
import { useRegister } from '@/hooks';
import { Button, Input, Alert } from '@/components/common';
import { organizationService } from '@/services/organizationService';

export function RegisterPage() {
  const { isAuthenticated, error, isLoading } = useAuthStore();
  const registerMutation = useRegister();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [registerSuccess, setRegisterSuccess] = useState(false);
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

  // 招待トークン検証状態
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteOrgName, setInviteOrgName] = useState('');
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    if (!inviteToken) return;

    setInviteLoading(true);
    organizationService
      .validateInvitation(inviteToken)
      .then((data) => {
        if (data.valid) {
          setInviteValid(true);
          setInviteOrgName(data.organizationName || '');
          if (data.email) {
            setFormData((prev) => ({ ...prev, email: data.email! }));
          }
        } else {
          setInviteError('招待リンクが無効または期限切れです。');
        }
      })
      .catch(() => {
        setInviteError('招待リンクの検証に失敗しました。');
      })
      .finally(() => {
        setInviteLoading(false);
      });
  }, [inviteToken]);

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
    } else {
      // 4条件のうち2つ以上を満たすかチェック
      const conditions = [
        /[a-z]/.test(formData.password), // 小文字
        /[A-Z]/.test(formData.password), // 大文字
        /\d/.test(formData.password),    // 数字
        /[@$!%*?&#^()_+\-=[\]{}|;:'",.<>?/\\`~]/.test(formData.password) // 特殊文字
      ];
      const conditionsMet = conditions.filter(Boolean).length;
      if (conditionsMet < 2) {
        errors.password =
          'パスワードは大文字、小文字、数字、特殊文字のうち2種類以上を含めてください';
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    registerMutation.mutate(
      {
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        inviteToken: inviteValid ? (inviteToken || undefined) : undefined,
      },
      {
        onSuccess: () => {
          setRegisterSuccess(true);
        },
      }
    );
  };

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const isInviteMode = inviteValid && !!inviteToken;

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

      {/* Right side - Register form */}
      <div className="flex w-full flex-col justify-center px-4 xs:px-6 sm:px-8 lg:px-16 md:w-3/5 lg:w-1/2">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 md:hidden">
            <h1 className="text-2xl font-bold text-primary-600">Partner Hub</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">新規登録</h2>
            {isInviteMode ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                <Building2 className="h-5 w-5 flex-shrink-0" />
                <span><strong>{inviteOrgName}</strong> への招待を受けて登録します</span>
              </div>
            ) : !inviteToken && !inviteLoading ? (
              <div className="mt-6 rounded-lg bg-gray-50 p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <Shield className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">招待が必要です</h3>
                <p className="mt-2 text-sm text-gray-600">
                  登録には管理者からの招待が必要です。<br />
                  招待リンクを受け取ってからアクセスしてください。
                </p>
                <Link
                  to="/login"
                  className="mt-4 inline-block rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  ログインページへ
                </Link>
              </div>
            ) : null}
          </div>

          {registerSuccess && (
            <div className="mt-6 rounded-lg bg-green-50 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-800">登録が完了しました</h3>
              <p className="mt-2 text-sm text-green-700">
                <strong>{formData.email}</strong> に確認メールを送信しました。
                メール内のリンクをクリックしてアカウントを有効化してください。
              </p>
              <Link
                to="/login"
                className="mt-4 inline-block rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                ログインページへ
              </Link>
            </div>
          )}

          {inviteLoading && (
            <div className="mt-6 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              <span className="ml-2 text-sm text-gray-600">招待を確認中...</span>
            </div>
          )}

          {inviteError && (
            <Alert variant="warning" className="mt-6">
              {inviteError}
            </Alert>
          )}

          {error && (
            <Alert variant="error" className="mt-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" style={{ display: (registerSuccess || (!inviteToken && !inviteLoading) || inviteError) ? 'none' : undefined }}>
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
              disabled={isInviteMode && !!formData.email}
            />

            <Input
              label="パスワード"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange('password')}
              error={validationErrors.password}
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
              isLoading={isLoading || inviteLoading}
              leftIcon={<UserPlus className="h-4 w-4" />}
            >
              {isInviteMode ? `${inviteOrgName} に参加する` : '管理者として登録する'}
            </Button>
          </form>

          {(inviteToken || inviteLoading) && (
            <p className="mt-6 text-center text-sm text-gray-600">
              既にアカウントをお持ちですか？{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                ログイン
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
