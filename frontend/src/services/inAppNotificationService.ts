import { api } from './api';
import type { InAppNotificationResponse } from '@/types';

export const inAppNotificationService = {
  async getNotifications(params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<InAppNotificationResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.unreadOnly) queryParams.set('unreadOnly', 'true');

    const query = queryParams.toString();
    const url = query ? `/notifications?${query}` : '/notifications';
    return api.get<InAppNotificationResponse>(url);
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ count: number }>('/notifications/unread-count');
    return response.count;
  },

  async markAsRead(id: string): Promise<boolean> {
    const response = await api.post<{ success: boolean }>(`/notifications/${id}/read`);
    return response.success;
  },

  async markAllAsRead(): Promise<number> {
    const response = await api.post<{ success: boolean; count: number }>('/notifications/read-all');
    return response.count;
  },

  async deleteNotification(id: string): Promise<boolean> {
    const response = await api.delete<{ success: boolean }>(`/notifications/${id}`);
    return response.success;
  },
};
