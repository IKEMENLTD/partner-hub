import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { ManagerDashboardPage } from './ManagerDashboardPage';

// Mock hooks
const mockUseDashboardStats = vi.fn();
const mockUseProjects = vi.fn();
const mockUsePartners = vi.fn();
const mockUseManagerDashboard = vi.fn();

vi.mock('@/hooks', () => ({
  useDashboardStats: () => mockUseDashboardStats(),
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
  usePartners: (...args: unknown[]) => mockUsePartners(...args),
  useManagerDashboard: () => mockUseManagerDashboard(),
}));

vi.mock('@/services/dashboardService', () => ({
  dashboardService: {
    exportCSV: vi.fn(),
  },
}));

// Mock common components
vi.mock('@/components/common', async () => {
  const actual = await vi.importActual('@/components/common');
  return {
    ...actual,
    useToast: () => ({ addToast: vi.fn() }),
  };
});

// Mock child components
vi.mock('@/components/project', () => ({
  ProjectCard: () => <div data-testid="project-card">ProjectCard</div>,
}));

describe('ManagerDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseDashboardStats.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    mockUseProjects.mockReturnValue({ data: undefined, isLoading: true });
    mockUsePartners.mockReturnValue({ data: undefined, isLoading: true });
    mockUseManagerDashboard.mockReturnValue({ data: undefined, isLoading: true });

    render(<ManagerDashboardPage />);
    expect(screen.queryByText('マネージャーダッシュボード')).not.toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseDashboardStats.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
      refetch: vi.fn(),
    });
    mockUseProjects.mockReturnValue({ data: undefined, isLoading: false });
    mockUsePartners.mockReturnValue({ data: undefined, isLoading: false });
    mockUseManagerDashboard.mockReturnValue({ data: undefined, isLoading: false });

    render(<ManagerDashboardPage />);
    expect(screen.getByText('ダッシュボードの読み込みに失敗しました')).toBeInTheDocument();
  });

  it('should render dashboard heading when loaded', () => {
    mockUseDashboardStats.mockReturnValue({
      data: {
        totalProjects: 10,
        activeProjects: 5,
        totalPartners: 3,
        activePartners: 2,
        totalTasks: 20,
        completedTasks: 10,
        overdueTasks: 2,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseProjects.mockReturnValue({
      data: { data: [], totalPages: 1, total: 0 },
      isLoading: false,
    });
    mockUsePartners.mockReturnValue({
      data: { data: [], totalPages: 1, total: 0 },
      isLoading: false,
    });
    mockUseManagerDashboard.mockReturnValue({
      data: { projectsAtRisk: [], teamWorkload: [], upcomingDeadlines: [] },
      isLoading: false,
    });

    render(<ManagerDashboardPage />);
    expect(screen.getByRole('heading', { name: 'マネージャーダッシュボード' })).toBeInTheDocument();
  });
});
