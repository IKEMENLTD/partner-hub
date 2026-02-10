import { api, PaginatedResponse, transformPaginatedResponse, extractData } from './api';
import type { Project, ProjectInput, ProjectFilter, TimelineEvent, ProjectTemplate } from '@/types';

interface ProjectListParams extends ProjectFilter {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export const projectService = {
  getAll: async (params?: ProjectListParams): Promise<PaginatedResponse<Project>> => {
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
        data: Project[];
        pagination: { total: number; limit: number; offset: number; hasMore: boolean };
      };
    }>(`/projects${query ? `?${query}` : ''}`);
    return transformPaginatedResponse(response);
  },

  getById: async (id: string): Promise<Project> => {
    const response = await api.get<{ success: boolean; data: Project }>(`/projects/${id}`);
    return extractData(response);
  },

  create: async (data: ProjectInput): Promise<Project> => {
    const response = await api.post<{ success: boolean; data: Project }>('/projects', data);
    return extractData(response);
  },

  update: async (id: string, data: Partial<ProjectInput>): Promise<Project> => {
    const response = await api.patch<{ success: boolean; data: Project }>(`/projects/${id}`, data);
    return extractData(response);
  },

  delete: (id: string) => api.delete<void>(`/projects/${id}`),

  getTimeline: async (id: string): Promise<TimelineEvent[]> => {
    const response = await api.get<{ success: boolean; data: TimelineEvent[] }>(`/projects/${id}/timeline`);
    return extractData(response);
  },

  addMember: async (projectId: string, userId: string, role: string): Promise<void> => {
    await api.post<{ success: boolean; data: null }>(`/projects/${projectId}/members`, {
      userId,
      role,
    });
  },

  removeMember: async (projectId: string, memberId: string): Promise<void> => {
    await api.delete<{ success: boolean; data: null }>(`/projects/${projectId}/members/${memberId}`);
  },

  getTemplates: async (): Promise<ProjectTemplate[]> => {
    const response = await api.get<{ success: boolean; data: ProjectTemplate[] }>('/projects/templates');
    return extractData(response);
  },

  getDeleted: async (): Promise<Project[]> => {
    const response = await api.get<{ success: boolean; data: Project[] }>('/projects/deleted');
    return extractData(response);
  },

  restore: async (id: string): Promise<Project> => {
    const response = await api.patch<{ success: boolean; data: Project }>(`/projects/${id}/restore`);
    return extractData(response);
  },
};
