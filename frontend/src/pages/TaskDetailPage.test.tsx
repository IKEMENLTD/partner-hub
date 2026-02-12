import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { TaskDetailPage } from './TaskDetailPage';

// Mock hooks
const mockUseTask = vi.fn();
const mockUseUpdateTask = vi.fn();
const mockUseDeleteTask = vi.fn();
const mockUseAddComment = vi.fn();
const mockUseAddSubtask = vi.fn();
const mockUseToggleSubtask = vi.fn();
const mockUseUpdateProgress = vi.fn();
const mockUseProject = vi.fn();

vi.mock('@/hooks', () => ({
  useTask: (...args: unknown[]) => mockUseTask(...args),
  useUpdateTask: () => mockUseUpdateTask(),
  useDeleteTask: () => mockUseDeleteTask(),
  useAddComment: () => mockUseAddComment(),
  useAddSubtask: () => mockUseAddSubtask(),
  useToggleSubtask: () => mockUseToggleSubtask(),
  useUpdateProgress: () => mockUseUpdateProgress(),
  useProject: (...args: unknown[]) => mockUseProject(...args),
}));

vi.mock('@/types', () => ({
  getUserDisplayName: (u: { firstName?: string; lastName?: string }) =>
    [u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Unknown',
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'project-1', taskId: 'task-1' }),
  };
});

const defaultMutationReturn = { mutate: vi.fn(), isPending: false };

describe('TaskDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUpdateTask.mockReturnValue(defaultMutationReturn);
    mockUseDeleteTask.mockReturnValue(defaultMutationReturn);
    mockUseAddComment.mockReturnValue(defaultMutationReturn);
    mockUseAddSubtask.mockReturnValue(defaultMutationReturn);
    mockUseToggleSubtask.mockReturnValue(defaultMutationReturn);
    mockUseUpdateProgress.mockReturnValue(defaultMutationReturn);
    mockUseProject.mockReturnValue({ data: null });
  });

  it('should render loading state', () => {
    mockUseTask.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<TaskDetailPage />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseTask.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
      refetch: vi.fn(),
    });

    render(<TaskDetailPage />);
    expect(screen.getByText('タスクの読み込みに失敗しました')).toBeInTheDocument();
  });

  it('should render not found state', () => {
    mockUseTask.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<TaskDetailPage />);
    expect(screen.getByText('タスクが見つかりません')).toBeInTheDocument();
  });

  it('should render task title as heading', () => {
    mockUseTask.mockReturnValue({
      data: {
        id: 'task-1',
        title: 'テストタスク',
        status: 'todo',
        priority: 'medium',
        projectId: 'project-1',
        progress: 0,
        subtasks: [],
        comments: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<TaskDetailPage />);
    expect(screen.getByRole('heading', { name: 'テストタスク' })).toBeInTheDocument();
  });
});
