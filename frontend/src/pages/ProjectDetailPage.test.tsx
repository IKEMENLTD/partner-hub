import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { ProjectDetailPage } from './ProjectDetailPage';

// Mock hooks
const mockUseProject = vi.fn();
const mockUseProjectTimeline = vi.fn();
const mockUseDeleteProject = vi.fn();
const mockUseUpdateTaskStatus = vi.fn();
const mockUseBulkCreateTasks = vi.fn();
const mockUseStakeholderTree = vi.fn();
const mockUseProjectStakeholders = vi.fn();
const mockUseAddStakeholder = vi.fn();
const mockUseUpdateStakeholder = vi.fn();
const mockUseDeleteStakeholder = vi.fn();
const mockUseProjectFiles = vi.fn();
const mockUseUploadFile = vi.fn();
const mockUseDeleteFile = vi.fn();
const mockUseGetDownloadUrl = vi.fn();
const mockUseProjectTasks = vi.fn();

vi.mock('@/hooks', () => ({
  useProject: (...args: unknown[]) => mockUseProject(...args),
  useProjectTimeline: (...args: unknown[]) => mockUseProjectTimeline(...args),
  useDeleteProject: () => mockUseDeleteProject(),
  useUpdateTaskStatus: () => mockUseUpdateTaskStatus(),
  useBulkCreateTasks: () => mockUseBulkCreateTasks(),
  useStakeholderTree: (...args: unknown[]) => mockUseStakeholderTree(...args),
  useProjectStakeholders: (...args: unknown[]) => mockUseProjectStakeholders(...args),
  useAddStakeholder: () => mockUseAddStakeholder(),
  useUpdateStakeholder: () => mockUseUpdateStakeholder(),
  useDeleteStakeholder: () => mockUseDeleteStakeholder(),
  useProjectFiles: (...args: unknown[]) => mockUseProjectFiles(...args),
  useUploadFile: () => mockUseUploadFile(),
  useDeleteFile: () => mockUseDeleteFile(),
  useGetDownloadUrl: () => mockUseGetDownloadUrl(),
  useProjectTasks: (...args: unknown[]) => mockUseProjectTasks(...args),
}));

vi.mock('@/hooks/useRecentProjects', () => ({
  addToRecentProjects: vi.fn(),
}));

vi.mock('@/types', () => ({
  getUserDisplayName: (u: { firstName?: string; lastName?: string }) =>
    [u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Unknown',
}));

// Mock child components
vi.mock('@/components/task', () => ({
  TaskList: () => <div data-testid="task-list">TaskList</div>,
  BulkAddTaskModal: () => null,
}));

vi.mock('@/components/project', () => ({
  ProjectTimeline: () => <div data-testid="project-timeline">ProjectTimeline</div>,
  HealthScoreCardDisplay: () => <div data-testid="health-score">HealthScore</div>,
  HealthScoreBreakdown: () => <div data-testid="health-breakdown">HealthBreakdown</div>,
}));

vi.mock('@/components/stakeholders', () => ({
  StakeholderTree: () => <div data-testid="stakeholder-tree">StakeholderTree</div>,
  AddStakeholderModal: () => null,
  DeleteStakeholderModal: () => null,
}));

vi.mock('@/components/files', () => ({
  FileUpload: () => <div data-testid="file-upload">FileUpload</div>,
  FileList: () => <div data-testid="file-list">FileList</div>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'project-1' }),
  };
});

const defaultMutationReturn = { mutate: vi.fn(), isPending: false };

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjectTimeline.mockReturnValue({ data: [] });
    mockUseDeleteProject.mockReturnValue(defaultMutationReturn);
    mockUseUpdateTaskStatus.mockReturnValue(defaultMutationReturn);
    mockUseBulkCreateTasks.mockReturnValue(defaultMutationReturn);
    mockUseStakeholderTree.mockReturnValue({ data: [], isLoading: false });
    mockUseProjectStakeholders.mockReturnValue({ data: [] });
    mockUseAddStakeholder.mockReturnValue(defaultMutationReturn);
    mockUseUpdateStakeholder.mockReturnValue(defaultMutationReturn);
    mockUseDeleteStakeholder.mockReturnValue(defaultMutationReturn);
    mockUseProjectFiles.mockReturnValue({ data: [], isLoading: false });
    mockUseUploadFile.mockReturnValue(defaultMutationReturn);
    mockUseDeleteFile.mockReturnValue(defaultMutationReturn);
    mockUseGetDownloadUrl.mockReturnValue(defaultMutationReturn);
    mockUseProjectTasks.mockReturnValue({ data: { data: [] } });
  });

  it('should render loading state', () => {
    mockUseProject.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<ProjectDetailPage />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseProject.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
      refetch: vi.fn(),
    });

    render(<ProjectDetailPage />);
    expect(screen.getByText('案件の読み込みに失敗しました')).toBeInTheDocument();
  });

  it('should render not found state', () => {
    mockUseProject.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ProjectDetailPage />);
    expect(screen.getByText('案件が見つかりません')).toBeInTheDocument();
  });

  it('should render project name as heading', () => {
    mockUseProject.mockReturnValue({
      data: {
        id: 'project-1',
        name: 'テスト案件',
        status: 'in_progress',
        priority: 'medium',
        startDate: '2025-01-01',
        progress: 50,
        partners: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ProjectDetailPage />);
    expect(screen.getByRole('heading', { name: 'テスト案件' })).toBeInTheDocument();
  });
});
