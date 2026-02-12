import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { ProgressReportPage } from './ProgressReportPage';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ token: 'test-token-123' }),
  };
});

// Mock service
vi.mock('@/services/progressReportService', () => ({
  progressReportService: {
    getFormData: vi.fn().mockRejectedValue(new Error('Token invalid')),
    submitReport: vi.fn(),
  },
}));

describe('ProgressReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(<ProgressReportPage />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('should render error state when token is invalid', async () => {
    render(<ProgressReportPage />);
    // Wait for the async call to reject
    await screen.findByText('エラーが発生しました', {}, { timeout: 3000 });
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
  });
});
