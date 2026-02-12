import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { AuditLogPage } from './AuditLogPage';

// Mock TanStack Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

// Mock audit service
vi.mock('@/services/auditService', () => ({
  auditService: {
    getAuditLogs: vi.fn(),
    getAll: vi.fn(),
    getRecent: vi.fn(),
  },
}));

import { useQuery } from '@tanstack/react-query';
const mockUseQuery = vi.mocked(useQuery);

describe('AuditLogPage', () => {
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

    render(<AuditLogPage />);
    // PageLoading should be shown when isLoading && page===1
    expect(screen.queryByRole('heading', { name: '監査ログ' })).not.toBeInTheDocument();
  });

  it('should render error state', () => {
    // First useQuery (audit-logs) returns error; second (recent) returns empty array
    mockUseQuery
      .mockReturnValueOnce({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Failed'),
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useQuery>)
      .mockReturnValueOnce({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof useQuery>);

    render(<AuditLogPage />);
    // The component renders error.message when error is an Error instance
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('should render audit log heading', () => {
    // First useQuery (audit-logs) returns paginated data; second (recent) returns an array
    mockUseQuery
      .mockReturnValueOnce({
        data: { data: [], total: 0, totalPages: 1 },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useQuery>)
      .mockReturnValueOnce({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof useQuery>);

    render(<AuditLogPage />);
    expect(screen.getByRole('heading', { name: '監査ログ' })).toBeInTheDocument();
  });
});
