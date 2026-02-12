import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { PartnerDetailPage } from './PartnerDetailPage';

// Mock hooks
const mockUsePartner = vi.fn();
const mockUsePartnerProjects = vi.fn();
const mockUseDeletePartner = vi.fn();
const mockUsePartnerReports = vi.fn();

vi.mock('@/hooks', () => ({
  usePartner: (...args: unknown[]) => mockUsePartner(...args),
  usePartnerProjects: (...args: unknown[]) => mockUsePartnerProjects(...args),
  useDeletePartner: () => mockUseDeletePartner(),
  usePartnerReports: (...args: unknown[]) => mockUsePartnerReports(...args),
  getProgressStatusLabel: (status: string) => status,
}));

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: null }),
    post: vi.fn().mockResolvedValue({}),
  },
}));

// Mock child components
vi.mock('@/components/project', () => ({
  ProjectCard: () => <div data-testid="project-card">ProjectCard</div>,
}));

vi.mock('@/components/partner', () => ({
  PartnerEvaluationCard: () => <div data-testid="partner-evaluation">PartnerEvaluation</div>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'partner-1' }),
  };
});

const defaultMutationReturn = { mutate: vi.fn(), isPending: false };

describe('PartnerDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePartnerProjects.mockReturnValue({ data: [] });
    mockUseDeletePartner.mockReturnValue(defaultMutationReturn);
    mockUsePartnerReports.mockReturnValue({ data: [], isLoading: false });
  });

  it('should render loading state', () => {
    mockUsePartner.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<PartnerDetailPage />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUsePartner.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
      refetch: vi.fn(),
    });

    render(<PartnerDetailPage />);
    expect(screen.getByText('パートナー情報の読み込みに失敗しました')).toBeInTheDocument();
  });

  it('should render not found state', () => {
    mockUsePartner.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<PartnerDetailPage />);
    expect(screen.getByText('パートナーが見つかりません')).toBeInTheDocument();
  });

  it('should render partner name as heading', () => {
    mockUsePartner.mockReturnValue({
      data: {
        id: 'partner-1',
        name: 'テストパートナー',
        status: 'active',
        email: 'test@example.com',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<PartnerDetailPage />);
    expect(screen.getByRole('heading', { name: 'テストパートナー' })).toBeInTheDocument();
  });
});
