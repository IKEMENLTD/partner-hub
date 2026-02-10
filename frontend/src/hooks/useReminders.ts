import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reminderService } from '@/services/reminderService';

const REMINDERS_KEY = ['reminders', 'my'];
const UNREAD_COUNT_KEY = ['reminders', 'unread-count'];

export function useMyReminders(unreadOnly?: boolean) {
  return useQuery({
    queryKey: [...REMINDERS_KEY, { unreadOnly }],
    queryFn: () => reminderService.getMyReminders(unreadOnly),
  });
}

export function useReminderUnreadCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: () => reminderService.getUnreadCount(),
    refetchInterval: 60_000,
  });
}

export function useMarkReminderAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reminderService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDERS_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}

export function useMarkAllRemindersAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reminderService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDERS_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}
