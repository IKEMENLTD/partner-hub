import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { MyTodayPage } from './MyTodayPage';

// Mock store
vi.mock('@/store', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1', firstName: '太郎', lastName: '山田', role: 'admin' },
  }),
}));

vi.mock('@/types', () => ({
  getUserDisplayName: (u: { firstName?: string; lastName?: string } | null | undefined) =>
    u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : '',
}));

// Mock hooks
const mockUseTodayStats = vi.fn();
const mockUseUpdateTaskStatus = vi.fn();
vi.mock('@/hooks', () => ({
  useTodayStats: () => mockUseTodayStats(),
  useUpdateTaskStatus: () => mockUseUpdateTaskStatus(),
}));

vi.mock('@/hooks/useRecentProjects', () => ({
  useRecentProjects: () => ({ projects: [], isLoading: false }),
}));

// Mock dashboard components
vi.mock('@/components/dashboard', () => ({
  TaskCard: () => <div data-testid="task-card">TaskCard</div>,
  UnreadReportsWidget: () => <div data-testid="unread-reports">UnreadReports</div>,
}));

describe('MyTodayPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUpdateTaskStatus.mockReturnValue({ mutate: vi.fn() });
  });

  it('should render loading state', () => {
    mockUseTodayStats.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<MyTodayPage />);
    expect(screen.queryByText(/おはようございます/)).not.toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseTodayStats.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
      refetch: vi.fn(),
    });

    render(<MyTodayPage />);
    expect(screen.getByText('データの読み込みに失敗しました')).toBeInTheDocument();
  });

  it('should render greeting heading', () => {
    mockUseTodayStats.mockReturnValue({
      data: {
        tasksForToday: [],
        upcomingDeadlines: [],
        upcomingProjectDeadlines: [],
        totalProjects: 0,
        totalPartners: 0,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<MyTodayPage />);
    expect(screen.getByText(/おはようございます/)).toBeInTheDocument();
  });

  it('should render quick stats', () => {
    mockUseTodayStats.mockReturnValue({
      data: {
        tasksForToday: [],
        upcomingDeadlines: [],
        upcomingProjectDeadlines: [],
        totalProjects: 5,
        totalPartners: 3,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<MyTodayPage />);
    // '本日期限のタスク' appears in both Quick Stats card and task section heading
    expect(screen.getAllByText('本日期限のタスク').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('案件数')).toBeInTheDocument();
  });
});
