import { api, extractData } from './api';

export interface SuperAdminStats {
  totalOrganizations: number;
  totalUsers: number;
  activeUsers: number;
}

export interface SuperAdminOrganization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  memberCount: number;
  ownerId?: string;
  createdAt: string;
}

export interface SuperAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  organizationId?: string;
  organizationName?: string | null;
  createdAt: string;
}

export const superAdminService = {
  getStats: async () => {
    const response = await api.get<{ success: boolean; data: SuperAdminStats }>('/super-admin/stats');
    return extractData(response);
  },

  getOrganizations: async () => {
    const response = await api.get<{ success: boolean; data: SuperAdminOrganization[] }>('/super-admin/organizations');
    return extractData(response);
  },

  deleteOrganization: async (id: string) => {
    const response = await api.delete<{ success: boolean; data: { message: string } }>(`/super-admin/organizations/${id}`);
    return extractData(response);
  },

  getUsers: async () => {
    const response = await api.get<{ success: boolean; data: SuperAdminUser[] }>('/super-admin/users');
    return extractData(response);
  },

  deleteUser: async (id: string) => {
    const response = await api.delete<{ success: boolean; data: { message: string } }>(`/super-admin/users/${id}`);
    return extractData(response);
  },

  setSuperAdmin: async (id: string) => {
    const response = await api.post<{ success: boolean; data: { message: string } }>(`/super-admin/users/${id}/set-super-admin`);
    return extractData(response);
  },

  revokeSuperAdmin: async (id: string) => {
    const response = await api.post<{ success: boolean; data: { message: string } }>(`/super-admin/users/${id}/revoke-super-admin`);
    return extractData(response);
  },
};
