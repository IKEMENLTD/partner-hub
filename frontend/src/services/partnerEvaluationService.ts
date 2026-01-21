import { api, PaginatedResponse, transformPaginatedResponse, extractData } from './api';
import type {
  PartnerEvaluation,
  PartnerEvaluationSummary,
  PartnerAutoMetrics,
  PartnerEvaluationInput,
  PartnerEvaluationFilter,
} from '@/types';

export const partnerEvaluationService = {
  /**
   * Get evaluation summary for a partner
   */
  getSummary: async (partnerId: string): Promise<PartnerEvaluationSummary> => {
    const response = await api.get<{ success: boolean; data: PartnerEvaluationSummary }>(
      `/partners/${partnerId}/evaluation`
    );
    return extractData(response);
  },

  /**
   * Get evaluation history for a partner
   */
  getHistory: async (
    partnerId: string,
    params?: PartnerEvaluationFilter
  ): Promise<PaginatedResponse<PartnerEvaluation>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          let normalizedKey = key;
          if (key === 'pageSize') {
            normalizedKey = 'limit';
          }
          searchParams.append(normalizedKey, String(value));
        }
      });
    }
    const query = searchParams.toString();
    const response = await api.get<{
      success: boolean;
      data: {
        data: PartnerEvaluation[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      };
    }>(`/partners/${partnerId}/evaluation/history${query ? `?${query}` : ''}`);
    return transformPaginatedResponse(response);
  },

  /**
   * Create a new manual evaluation
   */
  create: async (
    partnerId: string,
    data: PartnerEvaluationInput
  ): Promise<PartnerEvaluation> => {
    const response = await api.post<{ success: boolean; data: PartnerEvaluation }>(
      `/partners/${partnerId}/evaluation`,
      data
    );
    return extractData(response);
  },

  /**
   * Get auto-calculated metrics for a partner
   */
  getAutoMetrics: async (partnerId: string): Promise<PartnerAutoMetrics> => {
    const response = await api.get<{ success: boolean; data: PartnerAutoMetrics }>(
      `/partners/${partnerId}/evaluation/auto-metrics`
    );
    return extractData(response);
  },
};
