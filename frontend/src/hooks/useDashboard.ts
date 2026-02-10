import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '@/services';
import type { ManagerDashboardData } from '@/services/dashboardService';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useTodayStats() {
  return useQuery({
    queryKey: ['today-stats'],
    queryFn: () => dashboardService.getTodayStats(),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => dashboardService.getAlerts(),
    staleTime: 30 * 1000,
    refetchInterval: 1 * 60 * 1000,
  });
}

export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => dashboardService.markAlertAsRead(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useMarkAllAlertsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => dashboardService.markAllAlertsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useManagerDashboard(period?: string) {
  return useQuery<ManagerDashboardData>({
    queryKey: ['manager-dashboard', period || 'month'],
    queryFn: () => dashboardService.getManagerDashboard(period),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
