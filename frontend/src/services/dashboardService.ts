import { api, extractData } from './api';
import type { DashboardStats, TodayStats, Alert } from '@/types';
import { useAuthStore } from '@/store';

export type ReportType = 'weekly' | 'monthly' | 'custom';
export type ReportFormat = 'pdf' | 'excel' | 'csv';

export interface GenerateReportParams {
  reportType: ReportType;
  format: ReportFormat;
  startDate?: string;
  endDate?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

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

  /**
   * Generate and download a dashboard report
   * Returns the blob for client-side download handling
   */
  generateReport: async (params: GenerateReportParams): Promise<Blob> => {
    // Build query string
    const queryParams = new URLSearchParams({
      reportType: params.reportType,
      format: params.format,
    });

    if (params.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params.endDate) {
      queryParams.append('endDate', params.endDate);
    }

    // ストアからアクセストークンを取得（同期的）
    const { session } = useAuthStore.getState();
    const token = session?.access_token;

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/dashboard/reports/generate?${queryParams.toString()}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'レポートの生成に失敗しました');
    }

    return response.blob();
  },

  /**
   * Download a report file
   * Triggers browser download of the generated report
   */
  downloadReport: async (params: GenerateReportParams): Promise<string> => {
    const blob = await dashboardService.generateReport(params);

    // Extract filename from content-disposition or generate one
    const reportTypeName =
      params.reportType === 'weekly'
        ? '週次'
        : params.reportType === 'monthly'
        ? '月次'
        : 'カスタム';
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const extension = params.format === 'excel' ? 'xlsx' : params.format;
    const fileName = `ダッシュボード${reportTypeName}レポート_${dateStr}.${extension}`;

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return fileName;
  },
};
