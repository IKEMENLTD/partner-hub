import { api, extractData } from './api';
import type { DashboardStats, TodayStats, Alert } from '@/types';

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<{ success: boolean; data: DashboardStats }>('/dashboard/stats');
    return extractData(response);
  },

  getTodayStats: async (): Promise<TodayStats> => {
    const response = await api.get<{ success: boolean; data: TodayStats }>('/dashboard/today');
    return extractData(response);
  },

  getMyToday: async (): Promise<any> => {
    const response = await api.get<{ success: boolean; data: any }>('/dashboard/my-today');
    return extractData(response);
  },

  getManagerDashboard: async (period?: string): Promise<any> => {
    const query = period ? `?period=${period}` : '';
    const response = await api.get<{ success: boolean; data: any }>(`/dashboard/manager${query}`);
    return extractData(response);
  },

  getAlerts: async (): Promise<Alert[]> => {
    const response = await api.get<{ success: boolean; data: Alert[] }>('/dashboard/alerts');
    return extractData(response);
  },

  markAlertAsRead: async (alertId: string): Promise<void> => {
    await api.patch<{ success: boolean; data: null }>(`/dashboard/alerts/${alertId}/read`);
  },

  markAllAlertsAsRead: async (): Promise<void> => {
    await api.patch<{ success: boolean; data: null }>('/dashboard/alerts/read-all');
  },
};
