import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { ProjectListPage } from './ProjectListPage';

// Mock hooks
const mockUseProjects = vi.fn();
vi.mock('@/hooks', () => ({
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
}));

// Mock store
vi.mock('@/store', () => ({
  useUIStore: () => ({
    projectListView: 'list',
    setProjectListView: vi.fn(),
  }),
}));

// Mock project components
vi.mock('@/components/project', () => ({
  ProjectList: () => <div data-testid="project-list">ProjectList</div>,
  ProjectKanban: () => <div data-testid="project-kanban">ProjectKanban</div>,
  ProjectCalendar: () => <div data-testid="project-calendar">ProjectCalendar</div>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams()],
  };
});

describe('ProjectListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseProjects.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<ProjectListPage />);
    // PageLoading should be rendered
    expect(screen.queryByText('案件一覧')).not.toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseProjects.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
      refetch: vi.fn(),
    });

    render(<ProjectListPage />);
    expect(screen.getByText('案件の読み込みに失敗しました')).toBeInTheDocument();
  });

  it('should render page heading and project count', () => {
    mockUseProjects.mockReturnValue({
      data: { data: [], totalPages: 1, total: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ProjectListPage />);
    expect(screen.getByRole('heading', { name: /案件一覧/ })).toBeInTheDocument();
    expect(screen.getByText(/全 0 件の案件/)).toBeInTheDocument();
  });

  it('should render empty state when no projects', () => {
    mockUseProjects.mockReturnValue({
      data: { data: [], totalPages: 1, total: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ProjectListPage />);
    expect(screen.getByText('案件がありません')).toBeInTheDocument();
  });

  it('should render project list when projects exist', () => {
    mockUseProjects.mockReturnValue({
      data: {
        data: [{ id: '1', name: 'Test Project', status: 'in_progress', priority: 'medium', startDate: '2025-01-01' }],
        totalPages: 1,
        total: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ProjectListPage />);
    expect(screen.getByText(/全 1 件の案件/)).toBeInTheDocument();
    expect(screen.getByTestId('project-list')).toBeInTheDocument();
  });

  it('should render search input and filter button', () => {
    mockUseProjects.mockReturnValue({
      data: { data: [], totalPages: 1, total: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ProjectListPage />);
    expect(screen.getByPlaceholderText('案件を検索...')).toBeInTheDocument();
    expect(screen.getByText('フィルター')).toBeInTheDocument();
  });
});
