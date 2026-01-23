import { api } from './api';
import type { InAppNotificationResponse } from '@/types';

interface BackendResponse<T> {
  success: boolean;
  data: T;
}

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
    const response = await api.get<BackendResponse<InAppNotificationResponse>>(url);
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get<BackendResponse<{ count: number }>>('/notifications/unread-count');
    return response.data.count;
  },

  async markAsRead(id: string): Promise<boolean> {
    const response = await api.post<BackendResponse<{ success: boolean }>>(`/notifications/${id}/read`);
    return response.data.success;
  },

  async markAllAsRead(): Promise<number> {
    const response = await api.post<BackendResponse<{ success: boolean; count: number }>>('/notifications/read-all');
    return response.data.count;
  },

  async deleteNotification(id: string): Promise<boolean> {
    const response = await api.delete<BackendResponse<{ success: boolean }>>(`/notifications/${id}`);
    return response.data.success;
  },
};
