import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { PartnerReportsListPage } from './PartnerReportsListPage';

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

// Mock services
vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('@/hooks/usePartnerReports', () => ({
  getProgressStatusLabel: (status: string) => status,
}));

import { useQuery } from '@tanstack/react-query';
const mockUseQuery = vi.mocked(useQuery);

describe('PartnerReportsListPage', () => {
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

    render(<PartnerReportsListPage />);
    // The page heading is always rendered; loading spinner appears inside CardContent
    expect(screen.getByRole('heading', { name: 'パートナーからの報告' })).toBeInTheDocument();
    // A Loading component with role="status" should be present
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render reports heading and empty state', () => {
    mockUseQuery.mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useQuery>);

    render(<PartnerReportsListPage />);
    expect(screen.getByRole('heading', { name: 'パートナーからの報告' })).toBeInTheDocument();
    expect(screen.getByText('報告はありません')).toBeInTheDocument();
  });
});
