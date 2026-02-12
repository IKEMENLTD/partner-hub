import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { TrashPage } from './TrashPage';

// Mock hooks
const mockUseDeletedProjects = vi.fn();
const mockUseDeletedTasks = vi.fn();
const mockUseDeletedPartners = vi.fn();

vi.mock('@/hooks', () => ({
  useDeletedProjects: () => mockUseDeletedProjects(),
  useDeletedTasks: () => mockUseDeletedTasks(),
  useDeletedPartners: () => mockUseDeletedPartners(),
  useRestoreProject: () => ({ mutateAsync: vi.fn() }),
  useRestoreTask: () => ({ mutateAsync: vi.fn() }),
  useRestorePartner: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/components/common/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

describe('TrashPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render trash heading', () => {
    mockUseDeletedProjects.mockReturnValue({ data: [], isLoading: false });
    mockUseDeletedTasks.mockReturnValue({ data: [], isLoading: false });
    mockUseDeletedPartners.mockReturnValue({ data: [], isLoading: false });

    render(<TrashPage />);
    expect(screen.getByRole('heading', { name: 'ゴミ箱' })).toBeInTheDocument();
  });

  it('should render tab buttons', () => {
    mockUseDeletedProjects.mockReturnValue({ data: [], isLoading: false });
    mockUseDeletedTasks.mockReturnValue({ data: [], isLoading: false });
    mockUseDeletedPartners.mockReturnValue({ data: [], isLoading: false });

    render(<TrashPage />);
    expect(screen.getByText('案件')).toBeInTheDocument();
    expect(screen.getByText('タスク')).toBeInTheDocument();
    expect(screen.getByText('パートナー')).toBeInTheDocument();
  });

  it('should render empty state for projects tab', () => {
    mockUseDeletedProjects.mockReturnValue({ data: [], isLoading: false });
    mockUseDeletedTasks.mockReturnValue({ data: [], isLoading: false });
    mockUseDeletedPartners.mockReturnValue({ data: [], isLoading: false });

    render(<TrashPage />);
    expect(screen.getByText('削除済みの案件はありません')).toBeInTheDocument();
  });
});
