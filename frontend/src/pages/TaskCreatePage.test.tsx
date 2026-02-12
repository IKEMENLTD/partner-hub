import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { TaskCreatePage } from './TaskCreatePage';

// Mock hooks
const mockUseCreateTask = vi.fn();
const mockUseUpdateTask = vi.fn();
const mockUseTask = vi.fn();
const mockUseProject = vi.fn();

vi.mock('@/hooks', () => ({
  useCreateTask: () => mockUseCreateTask(),
  useUpdateTask: () => mockUseUpdateTask(),
  useTask: (...args: unknown[]) => mockUseTask(...args),
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
    useParams: () => ({ id: 'project-1' }), // No taskId = create mode
  };
});

const defaultMutationReturn = { mutate: vi.fn(), isPending: false, error: null };

describe('TaskCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateTask.mockReturnValue(defaultMutationReturn);
    mockUseUpdateTask.mockReturnValue(defaultMutationReturn);
    mockUseTask.mockReturnValue({ data: undefined, isLoading: false });
    mockUseProject.mockReturnValue({ data: { name: 'テスト案件', partners: [] }, isLoading: false });
  });

  it('should render loading state when project is loading', () => {
    mockUseProject.mockReturnValue({ data: undefined, isLoading: true });

    render(<TaskCreatePage />);
    expect(screen.queryByRole('heading', { name: '新規タスク作成' })).not.toBeInTheDocument();
  });

  it('should render create mode heading', () => {
    render(<TaskCreatePage />);
    expect(screen.getByRole('heading', { name: '新規タスク作成' })).toBeInTheDocument();
  });

  it('should render form fields', () => {
    render(<TaskCreatePage />);
    expect(screen.getByText('タスク名')).toBeInTheDocument();
    expect(screen.getByText('タスク情報')).toBeInTheDocument();
  });

  it('should render submit button with create label', () => {
    render(<TaskCreatePage />);
    expect(screen.getByRole('button', { name: /作成/ })).toBeInTheDocument();
  });

  it('should render cancel button', () => {
    render(<TaskCreatePage />);
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
  });
});
