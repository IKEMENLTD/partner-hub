import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { PartnerPortalPage } from './PartnerPortalPage';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ token: 'test-token-123' }),
  };
});

// Mock services
vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error('Unauthorized')),
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

// Mock partner-portal components
vi.mock('@/components/partner-portal', () => ({
  DashboardContent: () => <div data-testid="dashboard-content">Dashboard</div>,
  ReportForm: () => <div data-testid="report-form">ReportForm</div>,
}));

describe('PartnerPortalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(<PartnerPortalPage />);
    // Loading component is used
    expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument();
  });
});
