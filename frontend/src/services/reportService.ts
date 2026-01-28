import { api, extractData, transformPaginatedResponse } from './api';
import type { PaginatedResponse } from '@/types';

// Types
export type ReportPeriod = 'weekly' | 'monthly';
export type ReportConfigStatus = 'active' | 'paused' | 'deleted';
export type GeneratedReportStatus = 'pending' | 'generated' | 'sent' | 'failed';

export interface ReportConfig {
  id: string;
  name: string;
  description?: string;
  period: ReportPeriod;
  status: ReportConfigStatus;
  scheduleCron?: string;
  dayOfWeek: number;
  dayOfMonth: number;
  sendTime: string;
  recipients: string[];
  includeProjectSummary: boolean;
  includeTaskSummary: boolean;
  includePartnerPerformance: boolean;
  includeHighlights: boolean;
  projectIds?: string[];
  partnerIds?: string[];
  lastGeneratedAt?: string;
  nextRunAt?: string;
  createdById?: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ReportData {
  period: ReportPeriod;
  dateRange: {
    start: string;
    end: string;
  };
  projectSummary: {
    total: number;
    active: number;
    completed: number;
    delayed: number;
    byStatus: Record<string, number>;
  };
  taskSummary: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
    byPriority: Record<string, number>;
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
  highlights: {
    keyAchievements: string[];
    issues: string[];
    upcomingDeadlines: Array<{
      type: 'project' | 'task';
      id: string;
      name: string;
      dueDate: string;
      daysRemaining: number;
    }>;
  };
  healthScoreStats?: {
    averageScore: number;
    projectsAtRisk: number;
    totalProjects: number;
  };
}

export interface GeneratedReport {
  id: string;
  reportConfigId?: string;
  reportConfig?: ReportConfig;
  title: string;
  period: ReportPeriod;
  dateRangeStart: string;
  dateRangeEnd: string;
  status: GeneratedReportStatus;
  reportData: ReportData;
  sentTo: string[];
  sentAt?: string;
  errorMessage?: string;
  isManual: boolean;
  generatedById?: string;
  generatedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
}

export interface ReportConfigInput {
  name: string;
  description?: string;
  period: ReportPeriod;
  dayOfWeek?: number;
  dayOfMonth?: number;
  sendTime?: string;
  recipients: string[];
  includeProjectSummary?: boolean;
  includeTaskSummary?: boolean;
  includePartnerPerformance?: boolean;
  includeHighlights?: boolean;
  projectIds?: string[];
  partnerIds?: string[];
}

export interface ReportConfigUpdateInput extends Partial<ReportConfigInput> {
  status?: ReportConfigStatus;
}

export interface GenerateReportInput {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
  recipients?: string[];
  sendEmail?: boolean;
  reportConfigId?: string;
}

export interface ReportConfigFilter {
  [key: string]: string | number | undefined;
  page?: number;
  limit?: number;
  period?: ReportPeriod;
  status?: ReportConfigStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface GeneratedReportFilter {
  [key: string]: string | number | undefined;
  page?: number;
  limit?: number;
  reportConfigId?: string;
  period?: ReportPeriod;
  status?: GeneratedReportStatus;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Backend API response format
interface BackendApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface BackendPaginatedData<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Build query string
function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export const reportService = {
  // Report Configs
  async getConfigs(params?: ReportConfigFilter): Promise<PaginatedResponse<ReportConfig>> {
    const queryString = params ? buildQueryString(params) : '';
    const response = await api.get<BackendApiResponse<BackendPaginatedData<ReportConfig>>>(
      `/reports/configs${queryString}`
    );
    return transformPaginatedResponse(response);
  },

  async getConfigById(id: string): Promise<ReportConfig> {
    const response = await api.get<BackendApiResponse<ReportConfig>>(
      `/reports/configs/${id}`
    );
    return extractData(response);
  },

  async createConfig(data: ReportConfigInput): Promise<ReportConfig> {
    const response = await api.post<BackendApiResponse<ReportConfig>>(
      '/reports/configs',
      data
    );
    return extractData(response);
  },

  async updateConfig(id: string, data: ReportConfigUpdateInput): Promise<ReportConfig> {
    const response = await api.put<BackendApiResponse<ReportConfig>>(
      `/reports/configs/${id}`,
      data
    );
    return extractData(response);
  },

  async deleteConfig(id: string): Promise<void> {
    await api.delete(`/reports/configs/${id}`);
  },

  // Generated Reports
  async getReports(params?: GeneratedReportFilter): Promise<PaginatedResponse<GeneratedReport>> {
    const queryString = params ? buildQueryString(params) : '';
    const response = await api.get<BackendApiResponse<BackendPaginatedData<GeneratedReport>>>(
      `/reports${queryString}`
    );
    return transformPaginatedResponse(response);
  },

  async getReportById(id: string): Promise<GeneratedReport> {
    const response = await api.get<BackendApiResponse<GeneratedReport>>(
      `/reports/${id}`
    );
    return extractData(response);
  },

  async generateReport(data: GenerateReportInput): Promise<GeneratedReport> {
    const response = await api.post<BackendApiResponse<GeneratedReport>>(
      '/reports/generate',
      data
    );
    return extractData(response);
  },

  async triggerScheduledReports(): Promise<{ message: string }> {
    const response = await api.post<BackendApiResponse<{ message: string }>>(
      '/reports/trigger-scheduled'
    );
    return extractData(response);
  },
};
