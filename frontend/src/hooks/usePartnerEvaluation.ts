import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerEvaluationService } from '@/services';
import type { PartnerEvaluationInput, PartnerEvaluationFilter } from '@/types';

/**
 * Hook to get partner evaluation summary
 */
export function usePartnerEvaluationSummary(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-evaluation-summary', partnerId],
    queryFn: () => partnerEvaluationService.getSummary(partnerId!),
    enabled: !!partnerId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get partner evaluation history
 */
export function usePartnerEvaluationHistory(
  partnerId: string | undefined,
  params?: PartnerEvaluationFilter
) {
  return useQuery({
    queryKey: ['partner-evaluation-history', partnerId, params],
    queryFn: () => partnerEvaluationService.getHistory(partnerId!, params),
    enabled: !!partnerId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get partner auto-calculated metrics
 */
export function usePartnerAutoMetrics(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-auto-metrics', partnerId],
    queryFn: () => partnerEvaluationService.getAutoMetrics(partnerId!),
    enabled: !!partnerId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new partner evaluation
 */
export function useCreatePartnerEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      partnerId,
      data,
    }: {
      partnerId: string;
      data: PartnerEvaluationInput;
    }) => partnerEvaluationService.create(partnerId, data),
    onSuccess: (_, { partnerId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['partner-evaluation-summary', partnerId],
      });
      queryClient.invalidateQueries({
        queryKey: ['partner-evaluation-history', partnerId],
      });
      queryClient.invalidateQueries({
        queryKey: ['partner', partnerId],
      });
      queryClient.invalidateQueries({
        queryKey: ['partners'],
      });
    },
  });
}
