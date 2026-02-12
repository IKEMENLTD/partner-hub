import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { ResetPasswordPage } from './ResetPasswordPage';

// Mock store
vi.mock('@/store', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
  }),
}));

// Mock hooks
const mockUseResetPassword = vi.fn();
vi.mock('@/hooks', () => ({
  useResetPassword: () => mockUseResetPassword(),
}));

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.removeItem('password_recovery_mode');
  });

  it('should render invalid link state when no recovery mode', async () => {
    mockUseResetPassword.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: null,
    });

    render(<ResetPasswordPage />);
    // Without recovery mode in localStorage or hash params, the component
    // synchronously sets isValidSession to false, showing the invalid link state
    await screen.findByText('リンクが無効です', {}, { timeout: 3000 });
    expect(screen.getByText('リンクが無効です')).toBeInTheDocument();
  });

  it('should render invalid link state when session is invalid', async () => {
    mockUseResetPassword.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: null,
    });

    render(<ResetPasswordPage />);
    // After async check, if no recovery mode, shows invalid
    // The component sets isValidSession to false when no recovery mode
    // We need to wait for the async state change
    await screen.findByText('リンクが無効です', {}, { timeout: 3000 });
    expect(screen.getByText('リンクが無効です')).toBeInTheDocument();
  });
});
