import { api } from './api';

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

export interface InvitationListResponse {
  success: boolean;
  data: {
    data: OrganizationInvitation[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

export const organizationService = {
  validateInvitation: (token: string) =>
    api.get<{ success: boolean; data: InvitationValidation }>(
      `/organizations/invitations/validate/${token}`,
      true,
    ),

  listInvitations: (orgId: string, params?: { status?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return api.get<InvitationListResponse>(
      `/organizations/${orgId}/invitations${qs ? `?${qs}` : ''}`,
    );
  },

  createInvitation: (orgId: string, data: { email: string; role?: string; message?: string }) =>
    api.post<{ success: boolean; data: OrganizationInvitation }>(
      `/organizations/${orgId}/invitations`,
      data,
    ),

  cancelInvitation: (id: string) =>
    api.post<{ success: boolean; message: string }>(
      `/organizations/invitations/${id}/cancel`,
    ),

  resendInvitation: (id: string) =>
    api.post<{ success: boolean; message: string }>(
      `/organizations/invitations/${id}/resend`,
    ),
};
