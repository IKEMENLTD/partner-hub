import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { RemindersPage } from './RemindersPage';

// Mock hooks
const mockUseMyReminders = vi.fn();
const mockUseReminderUnreadCount = vi.fn();
const mockUseMarkReminderAsRead = vi.fn();
const mockUseMarkAllRemindersAsRead = vi.fn();

vi.mock('@/hooks/useReminders', () => ({
  useMyReminders: () => mockUseMyReminders(),
  useReminderUnreadCount: () => mockUseReminderUnreadCount(),
  useMarkReminderAsRead: () => mockUseMarkReminderAsRead(),
  useMarkAllRemindersAsRead: () => mockUseMarkAllRemindersAsRead(),
}));

const defaultMutationReturn = { mutate: vi.fn(), isPending: false };

describe('RemindersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReminderUnreadCount.mockReturnValue({ data: 0 });
    mockUseMarkReminderAsRead.mockReturnValue(defaultMutationReturn);
    mockUseMarkAllRemindersAsRead.mockReturnValue(defaultMutationReturn);
  });

  it('should render loading state', () => {
    mockUseMyReminders.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<RemindersPage />);
    expect(screen.queryByRole('heading', { name: 'リマインダー' })).not.toBeInTheDocument();
  });

  it('should render reminders heading', () => {
    mockUseMyReminders.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<RemindersPage />);
    expect(screen.getByRole('heading', { name: 'リマインダー' })).toBeInTheDocument();
  });

  it('should render empty state when no reminders', () => {
    mockUseMyReminders.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<RemindersPage />);
    expect(screen.getByText('リマインダーはありません')).toBeInTheDocument();
  });
});
