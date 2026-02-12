import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { PartnerListPage } from './PartnerListPage';

// Mock hooks
const mockUsePartners = vi.fn();
vi.mock('@/hooks', () => ({
  usePartners: (...args: unknown[]) => mockUsePartners(...args),
}));

// Mock partner components
vi.mock('@/components/partner', () => ({
  PartnerCard: ({ partner }: { partner: { name: string } }) => (
    <div data-testid="partner-card">{partner.name}</div>
  ),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('PartnerListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUsePartners.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<PartnerListPage />);
    expect(screen.queryByText('パートナー一覧')).not.toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUsePartners.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
      refetch: vi.fn(),
    });

    render(<PartnerListPage />);
    expect(screen.getByText('パートナーの読み込みに失敗しました')).toBeInTheDocument();
  });

  it('should render page heading and partner count', () => {
    mockUsePartners.mockReturnValue({
      data: { data: [], totalPages: 1, total: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<PartnerListPage />);
    expect(screen.getByRole('heading', { name: 'パートナー一覧' })).toBeInTheDocument();
    expect(screen.getByText(/全 0 社/)).toBeInTheDocument();
  });

  it('should render empty state when no partners', () => {
    mockUsePartners.mockReturnValue({
      data: { data: [], totalPages: 1, total: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<PartnerListPage />);
    expect(screen.getByText('パートナーがいません')).toBeInTheDocument();
  });

  it('should render search input and filter button', () => {
    mockUsePartners.mockReturnValue({
      data: { data: [], totalPages: 1, total: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<PartnerListPage />);
    expect(screen.getByPlaceholderText('パートナーを検索...')).toBeInTheDocument();
    expect(screen.getByText('フィルター')).toBeInTheDocument();
  });
});
