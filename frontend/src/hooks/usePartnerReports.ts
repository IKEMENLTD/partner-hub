import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

// Types
export interface PartnerReport {
  id: string;
  partnerId: string;
  projectId: string | null;
  reportType: string;
  progressStatus: 'on_track' | 'slightly_delayed' | 'has_issues' | null;
  content: string | null;
  weeklyAccomplishments: string | null;
  nextWeekPlan: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  partner: {
    id: string;
    name: string;
    email: string;
    companyName: string | null;
  };
  project: {
    id: string;
    name: string;
  } | null;
}

interface PaginatedReportsResponse {
  data: PartnerReport[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface UnreadCountResponse {
  unreadCount: number;
}

// Helper to unwrap API response
function unwrapResponse<T>(response: any): T {
  // Handle { success: true, data: {...} } wrapper
  if (response && typeof response === 'object' && 'data' in response && 'success' in response) {
    return response.data as T;
  }
  return response as T;
}

// Fetch unread report count
export function useUnreadReportCount() {
  return useQuery({
    queryKey: ['partnerReports', 'unreadCount'],
    queryFn: async () => {
      const response = await api.get<any>('/partner-reports/unread-count');
      console.log('Unread count response:', response);
      const data = unwrapResponse<UnreadCountResponse>(response);
      return data.unreadCount;
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });
}

// Fetch unread reports list
export function useUnreadReports(limit: number = 10) {
  return useQuery({
    queryKey: ['partnerReports', 'unread', limit],
    queryFn: async () => {
      const response = await api.get<any>(
        `/partner-reports?unreadOnly=true&limit=${limit}`
      );
      console.log('Unread reports response:', response);
      const data = unwrapResponse<PaginatedReportsResponse>(response);
      return data.data || [];
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// Fetch reports by partner ID
export function usePartnerReports(partnerId: string | undefined, limit: number = 20) {
  return useQuery({
    queryKey: ['partnerReports', 'byPartner', partnerId, limit],
    queryFn: async () => {
      const response = await api.get<any>(
        `/partner-reports?partnerId=${partnerId}&limit=${limit}`
      );
      console.log('Partner reports response:', response);
      const data = unwrapResponse<PaginatedReportsResponse>(response);
      return data.data || [];
    },
    enabled: !!partnerId,
    staleTime: 30000,
  });
}

// Mark report as read
export function useMarkReportAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      await api.patch(`/partner-reports/${reportId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerReports'] });
    },
  });
}

// Get progress status label
export function getProgressStatusLabel(status: string | null): string {
  switch (status) {
    case 'on_track':
      return '順調';
    case 'slightly_delayed':
      return 'やや遅れ';
    case 'has_issues':
      return '問題あり';
    default:
      return '';
  }
}

// Get progress status color
export function getProgressStatusColor(status: string | null): string {
  switch (status) {
    case 'on_track':
      return 'green';
    case 'slightly_delayed':
      return 'yellow';
    case 'has_issues':
      return 'red';
    default:
      return 'gray';
  }
}
