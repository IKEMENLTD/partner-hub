import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { RegisterPage } from './RegisterPage';

// Mock store
vi.mock('@/store', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    error: null,
    isLoading: false,
  }),
}));

// Mock hooks
vi.mock('@/hooks', () => ({
  useRegister: () => ({ mutate: vi.fn() }),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render register heading', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('heading', { name: '新規登録' })).toBeInTheDocument();
  });

  it('should render form fields', () => {
    render(<RegisterPage />);
    expect(screen.getByText('姓')).toBeInTheDocument();
    expect(screen.getByText('名')).toBeInTheDocument();
    expect(screen.getByText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByText('パスワード')).toBeInTheDocument();
  });

  it('should render submit button', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('button', { name: /登録する/ })).toBeInTheDocument();
  });

  it('should render login link', () => {
    render(<RegisterPage />);
    expect(screen.getByText('ログイン')).toBeInTheDocument();
  });
});
