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

// Manager Dashboard types
export interface ProjectAtRisk {
  id: string;
  name: string;
  status: string;
  progress: number;
  daysRemaining: number;
  overdueTaskCount: number;
  riskLevel: 'medium' | 'high' | 'critical';
  riskReasons: string[];
}

export interface TeamWorkloadItem {
  userId: string;
  userName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
}

export interface UpcomingDeadline {
  id: string;
  title: string;
  projectId: string;
  projectName?: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate: string;
  status: string;
  priority: string;
  daysRemaining: number;
}

export interface ManagerDashboardData {
  period: string;
  periodStart: string;
  periodEnd: string;
  projectSummary: {
    total: number;
    active: number;
    completed: number;
    delayed: number;
    onTrack: number;
    atRisk: number;
  };
  taskSummary: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
    completionRate: number;
  };
  partnerPerformance: Array<{
    partnerId: string;
    partnerName: string;
    activeProjects: number;
    tasksCompleted: number;
    tasksTotal: number;
    onTimeDeliveryRate: number;
    rating: number;
  }>;
  projectsAtRisk: ProjectAtRisk[];
  recentActivities: Array<Record<string, unknown>>;
  budgetOverview: {
    totalBudget: number;
    totalSpent: number;
    utilizationRate: number;
    projectBudgets: Array<Record<string, unknown>>;
  };
  upcomingDeadlines: UpcomingDeadline[];
  teamWorkload: TeamWorkloadItem[];
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

  getMyToday: async (): Promise<Record<string, unknown>> => {
    const response = await api.get<{ success: boolean; data: Record<string, unknown> }>('/dashboard/my-today');
    return extractData(response);
  },

  getManagerDashboard: async (period?: string): Promise<ManagerDashboardData> => {
    const query = period ? `?period=${period}` : '';
    const response = await api.get<{ success: boolean; data: ManagerDashboardData }>(`/dashboard/manager${query}`);
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
