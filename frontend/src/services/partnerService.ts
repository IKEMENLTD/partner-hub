import { api, PaginatedResponse, transformPaginatedResponse, extractData } from './api';
import type { Partner, PartnerInput, PartnerFilter, Project } from '@/types';

// Invitation verification response
export interface InvitationVerifyResponse {
  invitation: {
    id: string;
    email: string;
    expiresAt: string;
  };
  partner: Partner;
}

// Invitation registration request/response
export interface RegisterWithInvitationRequest {
  token: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterWithInvitationResponse {
  message: string;
  user: { id: string; email: string; firstName: string; lastName: string };
  partner: { id: string; name: string; email: string };
  session?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt: number;
  };
}

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
    const response = await api.get<{ success: boolean; data: { projects: Project[] } }>(`/partners/${partnerId}/projects`);
    return response.data.projects;
  },

  // Invitation methods (public - no auth required)
  verifyInvitation: async (token: string): Promise<InvitationVerifyResponse> => {
    const response = await api.get<{ success: boolean; data: InvitationVerifyResponse }>(
      `/partners/invitation/verify?token=${token}`,
      true // skipAuth
    );
    return extractData(response);
  },

  acceptInvitation: async (token: string, userId: string): Promise<Partner> => {
    const response = await api.post<{ success: boolean; data: Partner }>(
      '/partners/invitation/accept',
      { token, userId },
      true // skipAuth - this endpoint is public
    );
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

  // Register with invitation (new user registration via invitation)
  registerWithInvitation: async (
    request: RegisterWithInvitationRequest
  ): Promise<RegisterWithInvitationResponse> => {
    const response = await api.post<{ success: boolean; data: RegisterWithInvitationResponse }>(
      '/partners/invitation/register',
      request,
      true // skipAuth - this endpoint is public
    );
    return extractData(response);
  },
};
