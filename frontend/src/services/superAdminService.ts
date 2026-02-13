import { api } from './api';

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
  getStats: () =>
    api.get<SuperAdminStats>('/super-admin/stats'),

  getOrganizations: () =>
    api.get<SuperAdminOrganization[]>('/super-admin/organizations'),

  deleteOrganization: (id: string) =>
    api.delete<{ message: string }>(`/super-admin/organizations/${id}`),

  getUsers: () =>
    api.get<SuperAdminUser[]>('/super-admin/users'),

  deleteUser: (id: string) =>
    api.delete<{ message: string }>(`/super-admin/users/${id}`),

  setSuperAdmin: (id: string) =>
    api.post<{ message: string }>(`/super-admin/users/${id}/set-super-admin`),

  revokeSuperAdmin: (id: string) =>
    api.post<{ message: string }>(`/super-admin/users/${id}/revoke-super-admin`),
};
