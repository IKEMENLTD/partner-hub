import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reportService,
  type ReportConfigFilter,
  type GeneratedReportFilter,
  type ReportConfigInput,
  type ReportConfigUpdateInput,
  type GenerateReportInput,
} from '@/services';

// Report Configs

export function useReportConfigs(params?: ReportConfigFilter) {
  return useQuery({
    queryKey: ['reportConfigs', params],
    queryFn: () => reportService.getConfigs(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useReportConfig(id: string | undefined) {
  return useQuery({
    queryKey: ['reportConfig', id],
    queryFn: () => reportService.getConfigById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateReportConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReportConfigInput) => reportService.createConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportConfigs'] });
    },
  });
}

export function useUpdateReportConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReportConfigUpdateInput }) =>
      reportService.updateConfig(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['reportConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['reportConfig', id] });
    },
  });
}

export function useDeleteReportConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reportService.deleteConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportConfigs'] });
    },
  });
}

// Generated Reports

export function useGeneratedReports(params?: GeneratedReportFilter) {
  return useQuery({
    queryKey: ['generatedReports', params],
    queryFn: () => reportService.getReports(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGeneratedReport(id: string | undefined) {
  return useQuery({
    queryKey: ['generatedReport', id],
    queryFn: () => reportService.getReportById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateReportInput) => reportService.generateReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generatedReports'] });
      queryClient.invalidateQueries({ queryKey: ['reportConfigs'] });
    },
  });
}

export function useTriggerScheduledReports() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => reportService.triggerScheduledReports(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generatedReports'] });
      queryClient.invalidateQueries({ queryKey: ['reportConfigs'] });
    },
  });
}

// Utility functions

export function getPeriodLabel(period: 'weekly' | 'monthly'): string {
  return period === 'monthly' ? '月次' : '週次';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'アクティブ',
    paused: '一時停止',
    deleted: '削除済み',
    pending: '生成中',
    generated: '生成完了',
    sent: '送信済み',
    failed: '失敗',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    deleted: 'bg-gray-100 text-gray-800',
    pending: 'bg-blue-100 text-blue-800',
    generated: 'bg-green-100 text-green-800',
    sent: 'bg-primary-100 text-primary-800',
    failed: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getDayOfWeekLabel(day: number): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[day] || '';
}
