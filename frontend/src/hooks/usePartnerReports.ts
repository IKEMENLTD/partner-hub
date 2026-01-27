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

// Fetch unread report count
export function useUnreadReportCount() {
  return useQuery({
    queryKey: ['partnerReports', 'unreadCount'],
    queryFn: async () => {
      const response = await api.get<UnreadCountResponse>('/partner-reports/unread-count');
      return response.unreadCount;
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
      const response = await api.get<PaginatedReportsResponse>(
        `/partner-reports?unreadOnly=true&limit=${limit}`
      );
      return response.data;
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
      const response = await api.get<PaginatedReportsResponse>(
        `/partner-reports?partnerId=${partnerId}&limit=${limit}`
      );
      return response.data;
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
