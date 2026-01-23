import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { progressReportService, RequestReportData, ReviewReportData } from '@/services/progressReportService';

export function useProgressReports(taskId: string | undefined) {
  return useQuery({
    queryKey: ['progress-reports', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const response = await progressReportService.getReportsByTask(taskId);
      return response.data;
    },
    enabled: !!taskId,
  });
}

export function useRequestProgressReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RequestReportData) => progressReportService.requestReport(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['progress-reports', variables.taskId] });
    },
  });
}

export function useReviewProgressReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, data }: { reportId: string; data: ReviewReportData }) =>
      progressReportService.reviewReport(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress-reports'] });
    },
  });
}
