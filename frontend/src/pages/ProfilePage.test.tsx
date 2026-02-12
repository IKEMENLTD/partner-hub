import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { ProfilePage } from './ProfilePage';

// Mock store
vi.mock('@/store', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-1',
      firstName: '太郎',
      lastName: '山田',
      email: 'test@example.com',
      role: 'admin',
    },
    updateUser: vi.fn(),
  }),
}));

// Mock services
vi.mock('@/services/authService', () => ({
  authService: {
    updateProfile: vi.fn(),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}));

vi.mock('@/services/api', () => ({
  ApiError: class ApiError extends Error {},
}));

// Mock common
vi.mock('@/components/common', async () => {
  const actual = await vi.importActual('@/components/common');
  return {
    ...actual,
    useToast: () => ({ addToast: vi.fn() }),
  };
});

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render profile heading', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('heading', { name: 'プロフィール' })).toBeInTheDocument();
  });

  it('should render user info fields', () => {
    render(<ProfilePage />);
    // In non-editing mode, the component shows '氏名' and 'メールアドレス' labels
    expect(screen.getByText('氏名')).toBeInTheDocument();
    expect(screen.getByText('メールアドレス')).toBeInTheDocument();
  });
});
