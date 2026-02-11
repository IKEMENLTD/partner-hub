import { api, extractData } from './api';

export interface AuditLog {
  id: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE';
  entityName: string;
  entityId: string;
  userId: string;
  userEmail?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditPaginatedResult {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditFilter {
  entityName?: string;
  action?: string;
  userId?: string;
  userEmail?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

function buildQueryString(params?: Record<string, string | number | undefined | null>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const auditService = {
  /**
   * Get all audit logs with pagination and filtering
   */
  getAll: async (params?: AuditFilter): Promise<AuditPaginatedResult> => {
    const query = buildQueryString(params as Record<string, string | number | undefined>);
    const response = await api.get<{ success: boolean; data: AuditPaginatedResult }>(`/audit${query}`);
    return extractData(response);
  },

  /**
   * Get recent audit logs
   */
  getRecent: async (limit?: number): Promise<AuditLog[]> => {
    const query = buildQueryString({ limit });
    const response = await api.get<{ success: boolean; data: AuditLog[] }>(`/audit/recent${query}`);
    return extractData(response);
  },

  /**
   * Get audit logs for a specific entity
   */
  getByEntity: async (entityName: string, entityId: string): Promise<AuditLog[]> => {
    const response = await api.get<{ success: boolean; data: AuditLog[] }>(
      `/audit/entity/${encodeURIComponent(entityName)}/${encodeURIComponent(entityId)}`
    );
    return extractData(response);
  },

  /**
   * Get audit logs for a specific user
   */
  getByUser: async (userId: string, limit?: number): Promise<AuditLog[]> => {
    const query = buildQueryString({ limit });
    const response = await api.get<{ success: boolean; data: AuditLog[] }>(
      `/audit/user/${encodeURIComponent(userId)}${query}`
    );
    return extractData(response);
  },

  /**
   * Get audit logs within a date range
   */
  getByDateRange: async (startDate: string, endDate: string): Promise<AuditLog[]> => {
    const query = buildQueryString({ startDate, endDate });
    const response = await api.get<{ success: boolean; data: AuditLog[] }>(`/audit/date-range${query}`);
    return extractData(response);
  },
};
