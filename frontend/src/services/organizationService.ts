import { api, extractData } from './api';

export interface InvitationValidation {
  valid: boolean;
  organizationName?: string;
  email?: string;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: string;
  message?: string;
  createdAt: string;
}

export interface InvitationListData {
  data: OrganizationInvitation[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const organizationService = {
  validateInvitation: async (token: string) => {
    const response = await api.get<{ success: boolean; data: InvitationValidation }>(
      `/organizations/invitations/validate/${token}`,
      true,
    );
    return extractData(response);
  },

  listInvitations: async (orgId: string, params?: { status?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    const response = await api.get<{ success: boolean; data: InvitationListData }>(
      `/organizations/${orgId}/invitations${qs ? `?${qs}` : ''}`,
    );
    return extractData(response);
  },

  createInvitation: async (orgId: string, data: { email: string; role?: string; message?: string }) => {
    const response = await api.post<{ success: boolean; data: OrganizationInvitation }>(
      `/organizations/${orgId}/invitations`,
      data,
    );
    return extractData(response);
  },

  cancelInvitation: async (id: string) => {
    const response = await api.post<{ success: boolean; data: { message: string } }>(
      `/organizations/invitations/${id}/cancel`,
    );
    return extractData(response);
  },

  resendInvitation: async (id: string) => {
    const response = await api.post<{ success: boolean; data: { message: string } }>(
      `/organizations/invitations/${id}/resend`,
    );
    return extractData(response);
  },
};
