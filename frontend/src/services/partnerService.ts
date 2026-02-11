import { api, PaginatedResponse, transformPaginatedResponse, extractData } from './api';
import type { Partner, PartnerInput, PartnerFilter, Project } from '@/types';

interface PartnerListParams extends PartnerFilter {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export const partnerService = {
  getAll: async (params?: PartnerListParams): Promise<PaginatedResponse<Partner>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // パラメータ名の正規化
          let normalizedKey = key;
          let normalizedValue = value;

          if (key === 'pageSize') {
            normalizedKey = 'limit';
          } else if (key === 'sortField') {
            normalizedKey = 'sortBy';
          } else if (key === 'sortOrder') {
            normalizedValue = String(value).toUpperCase();
          }

          if (Array.isArray(normalizedValue)) {
            normalizedValue.forEach((v) => searchParams.append(normalizedKey, String(v)));
          } else {
            searchParams.append(normalizedKey, String(normalizedValue));
          }
        }
      });
    }
    const query = searchParams.toString();
    const response = await api.get<{
      success: boolean;
      data: {
        data: Partner[];
        pagination: { total: number; limit: number; offset: number; hasMore: boolean };
      };
    }>(`/partners${query ? `?${query}` : ''}`);
    return transformPaginatedResponse(response);
  },

  getById: async (id: string): Promise<Partner> => {
    const response = await api.get<{ success: boolean; data: Partner }>(`/partners/${id}`);
    return extractData(response);
  },

  create: async (data: PartnerInput): Promise<Partner> => {
    const response = await api.post<{ success: boolean; data: Partner }>('/partners', data);
    return extractData(response);
  },

  update: async (id: string, data: Partial<PartnerInput>): Promise<Partner> => {
    const response = await api.patch<{ success: boolean; data: Partner }>(`/partners/${id}`, data);
    return extractData(response);
  },

  delete: (id: string) => api.delete<void>(`/partners/${id}`),

  getProjects: async (partnerId: string): Promise<Project[]> => {
    const response = await api.get<{ success: boolean; data: Project[] }>(`/partners/${partnerId}/projects`);
    return extractData(response);
  },

  getDeleted: async (): Promise<Partner[]> => {
    const response = await api.get<{ success: boolean; data: Partner[] }>('/partners/deleted');
    return extractData(response);
  },

  restore: async (id: string): Promise<Partner> => {
    const response = await api.patch<{ success: boolean; data: Partner }>(`/partners/${id}/restore`);
    return extractData(response);
  },
};
