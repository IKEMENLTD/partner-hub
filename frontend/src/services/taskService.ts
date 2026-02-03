import { api, PaginatedResponse, transformPaginatedResponse, extractData } from './api';
import type { Task, TaskInput, TaskFilter } from '@/types';

interface TaskListParams extends TaskFilter {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export const taskService = {
  getAll: async (params?: TaskListParams): Promise<PaginatedResponse<Task>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => searchParams.append(key, String(v)));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }
    const query = searchParams.toString();
    const response = await api.get<{
      success: boolean;
      data: {
        data: Task[];
        pagination: { total: number; limit: number; offset: number; hasMore: boolean };
      };
    }>(`/tasks${query ? `?${query}` : ''}`);
    return transformPaginatedResponse(response);
  },

  getByProject: async (projectId: string, params?: TaskListParams): Promise<PaginatedResponse<Task>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => searchParams.append(key, String(v)));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }
    const query = searchParams.toString();
    const response = await api.get<{
      success: boolean;
      data: {
        data: Task[];
        pagination: { total: number; limit: number; offset: number; hasMore: boolean };
      };
    }>(`/projects/${projectId}/tasks${query ? `?${query}` : ''}`);
    return transformPaginatedResponse(response);
  },

  createForProject: async (projectId: string, data: TaskInput): Promise<Task> => {
    const response = await api.post<{ success: boolean; data: Task }>(`/projects/${projectId}/tasks`, data);
    return extractData(response);
  },

  getById: async (id: string): Promise<Task> => {
    const response = await api.get<{ success: boolean; data: Task }>(`/tasks/${id}`);
    return extractData(response);
  },

  create: async (data: TaskInput): Promise<Task> => {
    const response = await api.post<{ success: boolean; data: Task }>('/tasks', data);
    return extractData(response);
  },

  update: async (id: string, data: Partial<TaskInput>): Promise<Task> => {
    const response = await api.patch<{ success: boolean; data: Task }>(`/tasks/${id}`, data);
    return extractData(response);
  },

  delete: (id: string) => api.delete<void>(`/tasks/${id}`),

  getMyTasks: async (): Promise<Task[]> => {
    const response = await api.get<{ success: boolean; data: Task[] }>('/tasks/my');
    return extractData(response);
  },

  getTodayTasks: async (): Promise<Task[]> => {
    const response = await api.get<{ success: boolean; data: Task[] }>('/tasks/today');
    return extractData(response);
  },

  addComment: async (taskId: string, content: string): Promise<void> => {
    await api.post<{ success: boolean; data: null }>(`/tasks/${taskId}/comments`, { content });
  },

  addSubtask: async (taskId: string, title: string): Promise<void> => {
    await api.post<{ success: boolean; data: null }>(`/tasks/${taskId}/subtasks`, { title });
  },

  toggleSubtask: async (taskId: string, subtaskId: string): Promise<void> => {
    await api.patch<{ success: boolean; data: null }>(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`);
  },
};
