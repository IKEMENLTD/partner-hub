import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { NotificationsPage } from './NotificationsPage';

// Mock hooks
const mockUseInAppNotifications = vi.fn();
vi.mock('@/hooks/useInAppNotifications', () => ({
  useInAppNotifications: () => mockUseInAppNotifications(),
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseInAppNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isLoading: true,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    });

    render(<NotificationsPage />);
    expect(screen.queryByRole('heading', { name: '通知' })).not.toBeInTheDocument();
  });

  it('should render notifications heading', () => {
    mockUseInAppNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    });

    render(<NotificationsPage />);
    expect(screen.getByRole('heading', { name: '通知' })).toBeInTheDocument();
  });

  it('should render empty state when no notifications', () => {
    mockUseInAppNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    });

    render(<NotificationsPage />);
    expect(screen.getByText('通知はありません')).toBeInTheDocument();
  });
});
