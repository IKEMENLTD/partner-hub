import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { SettingsPage } from './SettingsPage';

// Mock store
vi.mock('@/store', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1', role: 'admin' },
    logout: vi.fn(),
  }),
  useUIStore: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    sidebarCollapsed: false,
    setSidebarCollapsed: vi.fn(),
  }),
}));

// Mock hooks
const mockUseNotificationSettings = vi.fn();
const mockUseUpdateNotificationSettings = vi.fn();

vi.mock('@/hooks', () => ({
  useNotificationSettings: () => mockUseNotificationSettings(),
  useUpdateNotificationSettings: () => mockUseUpdateNotificationSettings(),
}));

// Mock settings components
vi.mock('@/components/settings', () => ({
  HelpCenterModal: () => null,
  ContactModal: () => null,
  TermsModal: () => null,
  PrivacyPolicyModal: () => null,
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotificationSettings.mockReturnValue({
      data: { emailNotifications: true, pushNotifications: true },
      isLoading: false,
    });
    mockUseUpdateNotificationSettings.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('should render settings heading', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument();
  });
});
