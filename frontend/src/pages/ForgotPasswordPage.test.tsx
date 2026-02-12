import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { ForgotPasswordPage } from './ForgotPasswordPage';

// Mock store
vi.mock('@/store', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
  }),
}));

// Mock hooks
const mockUseForgotPassword = vi.fn();
vi.mock('@/hooks', () => ({
  useForgotPassword: () => mockUseForgotPassword(),
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render forgot password heading', () => {
    mockUseForgotPassword.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: null,
    });

    render(<ForgotPasswordPage />);
    expect(screen.getByRole('heading', { name: 'パスワードをお忘れの方' })).toBeInTheDocument();
  });

  it('should render email input', () => {
    mockUseForgotPassword.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: null,
    });

    render(<ForgotPasswordPage />);
    expect(screen.getByText('メールアドレス')).toBeInTheDocument();
  });

  it('should render success message when isSuccess', () => {
    mockUseForgotPassword.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: true,
      error: null,
    });

    render(<ForgotPasswordPage />);
    expect(screen.getByText('メールを送信しました')).toBeInTheDocument();
  });

  it('should render login link', () => {
    mockUseForgotPassword.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: null,
    });

    render(<ForgotPasswordPage />);
    expect(screen.getByText('ログイン画面に戻る')).toBeInTheDocument();
  });
});
