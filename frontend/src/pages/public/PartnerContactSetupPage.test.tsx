import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { PartnerContactSetupPage } from './PartnerContactSetupPage';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ token: 'test-token-123' }),
  };
});

// Mock service
vi.mock('@/services/partnerContactSetupService', () => ({
  partnerContactSetupService: {
    verifyToken: vi.fn().mockRejectedValue(new Error('Token invalid')),
    submitSetup: vi.fn(),
  },
}));

describe('PartnerContactSetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(<PartnerContactSetupPage />);
    // Shows loading spinner initially
    expect(screen.queryByText('連絡先設定')).not.toBeInTheDocument();
  });

  it('should render error state when token verification fails', async () => {
    render(<PartnerContactSetupPage />);
    // Wait for the async token verification to fail
    await screen.findByText('トークンの検証に失敗しました', {}, { timeout: 3000 });
    expect(screen.getByText('トークンの検証に失敗しました')).toBeInTheDocument();
  });
});
