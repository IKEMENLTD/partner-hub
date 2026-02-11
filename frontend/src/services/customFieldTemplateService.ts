import { api, PaginatedResponse, transformPaginatedResponse, extractData } from './api';
import type { CustomFieldTemplate, CustomFieldTemplateInput, CustomFieldTemplateFilter } from '@/types';

export const customFieldTemplateService = {
  getAll: async (params?: CustomFieldTemplateFilter): Promise<PaginatedResponse<CustomFieldTemplate>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    const response = await api.get<{
      success: boolean;
      data: {
        data: CustomFieldTemplate[];
        pagination: { total: number; limit: number; offset: number; hasMore: boolean };
      };
    }>(`/custom-field-templates${query ? `?${query}` : ''}`);
    return transformPaginatedResponse(response);
  },

  getById: async (id: string): Promise<CustomFieldTemplate> => {
    const response = await api.get<{ success: boolean; data: CustomFieldTemplate }>(
      `/custom-field-templates/${id}`
    );
    return extractData(response);
  },

  create: async (data: CustomFieldTemplateInput): Promise<CustomFieldTemplate> => {
    // フィールドにorderを付与
    const fieldsWithOrder = data.fields.map((field, index) => ({
      ...field,
      order: field.order ?? index,
      required: field.required ?? false,
    }));

    const response = await api.post<{ success: boolean; data: CustomFieldTemplate }>(
      '/custom-field-templates',
      { ...data, fields: fieldsWithOrder }
    );
    return extractData(response);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/custom-field-templates/${id}`);
  },

  deactivate: async (id: string): Promise<void> => {
    await api.post(`/custom-field-templates/${id}/deactivate`, {});
  },

  incrementUsage: async (id: string): Promise<CustomFieldTemplate> => {
    const response = await api.post<{ success: boolean; data: CustomFieldTemplate }>(
      `/custom-field-templates/${id}/increment-usage`
    );
    return extractData(response);
  },
};
