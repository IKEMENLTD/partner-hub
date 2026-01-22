import { api, extractData } from './api';
import type { NotificationSettings, NotificationSettingsInput } from '@/types';

// バックエンドAPIレスポンス型
interface BackendApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const notificationSettingsService = {
  /**
   * 現在のユーザーの通知設定を取得
   */
  getSettings: async (): Promise<NotificationSettings> => {
    const response = await api.get<BackendApiResponse<NotificationSettings>>(
      '/users/me/notification-settings'
    );
    return extractData(response);
  },

  /**
   * 現在のユーザーの通知設定を更新
   */
  updateSettings: async (
    data: NotificationSettingsInput
  ): Promise<NotificationSettings> => {
    const response = await api.patch<BackendApiResponse<NotificationSettings>>(
      '/users/me/notification-settings',
      data
    );
    return extractData(response);
  },
};
