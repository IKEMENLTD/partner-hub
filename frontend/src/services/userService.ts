import { api, extractData } from './api';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface BackendResponse<T> {
  success: boolean;
  data: T;
}

export const userService = {
  async getAll(): Promise<UserProfile[]> {
    const response = await api.get<BackendResponse<UserProfile[]>>('/auth/users');
    return extractData(response);
  },

  async getById(id: string): Promise<UserProfile> {
    const response = await api.get<BackendResponse<UserProfile>>(`/auth/users/${id}`);
    return extractData(response);
  },

  async updateRole(id: string, role: string): Promise<UserProfile> {
    const response = await api.patch<BackendResponse<UserProfile>>(`/auth/users/${id}`, { role });
    return extractData(response);
  },

  async deactivate(id: string): Promise<void> {
    await api.post(`/auth/users/${id}/deactivate`, {});
  },

  async activate(id: string): Promise<void> {
    await api.post(`/auth/users/${id}/activate`, {});
  },
};
