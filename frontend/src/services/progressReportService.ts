import { api } from './api';

export interface ProgressReportFormData {
  reportId: string;
  reporterName: string;
  reporterEmail: string;
  tokenExpiresAt: string;
  task: {
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    project: {
      id: string;
      name: string;
    } | null;
  };
}

export interface SubmitReportData {
  reporterName: string;
  progress: number;
  comment?: string;
  attachmentUrls?: string[];
}

export interface RequestReportData {
  taskId: string;
  partnerEmail: string;
  partnerName?: string;
}

export interface ProgressReport {
  id: string;
  reporterName: string;
  reporterEmail: string;
  progress: number;
  status: 'pending' | 'reviewed' | 'rejected';
  comment: string | null;
  attachmentUrls: string[] | null;
  reviewerComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewReportData {
  status: 'reviewed' | 'rejected';
  reviewerComment?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const progressReportService = {
  /**
   * Get form data for a progress report token (public, no auth required)
   */
  getFormData: async (token: string): Promise<ApiResponse<ProgressReportFormData>> => {
    return api.get<ApiResponse<ProgressReportFormData>>(
      `/progress-reports/form/${token}`,
      true // skipAuth
    );
  },

  /**
   * Submit a progress report (public, no auth required)
   */
  submitReport: async (
    token: string,
    data: SubmitReportData
  ): Promise<ApiResponse<{ id: string; progress: number; submittedAt: string }>> => {
    return api.post<ApiResponse<{ id: string; progress: number; submittedAt: string }>>(
      `/progress-reports/submit/${token}`,
      data,
      true // skipAuth
    );
  },

  /**
   * Request a progress report from a partner (requires auth)
   */
  requestReport: async (
    data: RequestReportData
  ): Promise<ApiResponse<{ id: string; taskId: string; reporterEmail: string; tokenExpiresAt: string }>> => {
    return api.post<ApiResponse<{ id: string; taskId: string; reporterEmail: string; tokenExpiresAt: string }>>(
      '/progress-reports/request',
      data
    );
  },

  /**
   * Get all progress reports for a task (requires auth)
   */
  getReportsByTask: async (taskId: string): Promise<ApiResponse<ProgressReport[]>> => {
    return api.get<ApiResponse<ProgressReport[]>>(`/progress-reports/task/${taskId}`);
  },

  /**
   * Get a single progress report by ID (requires auth)
   */
  getReportById: async (reportId: string): Promise<ApiResponse<ProgressReport>> => {
    return api.get<ApiResponse<ProgressReport>>(`/progress-reports/${reportId}`);
  },

  /**
   * Review a progress report (requires auth)
   */
  reviewReport: async (
    reportId: string,
    data: ReviewReportData
  ): Promise<ApiResponse<{ id: string; status: string; reviewerComment: string | null; reviewedAt: string }>> => {
    return api.patch<ApiResponse<{ id: string; status: string; reviewerComment: string | null; reviewedAt: string }>>(
      `/progress-reports/${reportId}/review`,
      data
    );
  },
};
