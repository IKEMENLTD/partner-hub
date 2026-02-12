import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { AdminSettingsPage } from './AdminSettingsPage';

// Mock store
const mockUser = { id: 'user-1', role: 'admin' };
vi.mock('@/store', () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}));

// Mock service
vi.mock('@/services/systemSettingsService', () => ({
  systemSettingsService: {
    getSettings: vi.fn().mockResolvedValue({
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioPhoneNumber: '',
    }),
    updateSettings: vi.fn(),
    testSms: vi.fn(),
  },
}));

describe('AdminSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render system settings heading for admin', async () => {
    render(<AdminSettingsPage />);
    // Wait for async loading to complete
    await screen.findByRole('heading', { name: 'システム設定' });
    expect(screen.getByRole('heading', { name: 'システム設定' })).toBeInTheDocument();
  });

  it('should render access denied for non-admin', () => {
    // Override the mock to return non-admin
    mockUser.role = 'member';
    render(<AdminSettingsPage />);
    expect(screen.getByText('アクセス権限がありません')).toBeInTheDocument();
    // Restore
    mockUser.role = 'admin';
  });
});
