import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationSettingsService } from '@/services';
import type { NotificationSettingsInput } from '@/types';

const QUERY_KEY = ['notification-settings'];

/**
 * 通知設定を取得するhook
 */
export function useNotificationSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => notificationSettingsService.getSettings(),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });
}

/**
 * 通知設定を更新するhook
 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NotificationSettingsInput) =>
      notificationSettingsService.updateSettings(data),
    onSuccess: (updatedSettings) => {
      // キャッシュを更新
      queryClient.setQueryData(QUERY_KEY, updatedSettings);
    },
  });
}
