import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { UserManagementPage } from './UserManagementPage';

// Mock TanStack Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
    useQueryClient: vi.fn().mockReturnValue({ invalidateQueries: vi.fn() }),
  };
});

// Mock user service
vi.mock('@/services/userService', () => ({
  userService: {
    getUsers: vi.fn(),
    updateUserRole: vi.fn(),
    activateUser: vi.fn(),
    deactivateUser: vi.fn(),
  },
}));

import { useQuery } from '@tanstack/react-query';
const mockUseQuery = vi.mocked(useQuery);

describe('UserManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useQuery>);

    render(<UserManagementPage />);
    expect(screen.queryByRole('heading', { name: 'ユーザー管理' })).not.toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('ユーザー一覧の取得に失敗しました'),
    } as ReturnType<typeof useQuery>);

    render(<UserManagementPage />);
    expect(screen.getByText(/ユーザー一覧の取得に失敗しました/)).toBeInTheDocument();
  });

  it('should render user management heading', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useQuery>);

    render(<UserManagementPage />);
    expect(screen.getByRole('heading', { name: 'ユーザー管理' })).toBeInTheDocument();
  });
});
