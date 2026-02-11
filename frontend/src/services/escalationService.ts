import { api } from './api';

export type EscalationTriggerType = 'days_before_due' | 'days_after_due' | 'progress_below';
export type EscalationAction = 'notify_owner' | 'notify_stakeholders' | 'escalate_to_manager';
export type EscalationRuleStatus = 'active' | 'inactive';
export type EscalationLogStatus = 'pending' | 'executed' | 'failed';

export interface EscalationRule {
  id: string;
  name: string;
  description?: string;
  projectId?: string;
  project?: { id: string; name: string };
  triggerType: EscalationTriggerType;
  triggerValue: number;
  action: EscalationAction;
  status: EscalationRuleStatus;
  priority: number;
  notifyEmails?: string[];
  escalateToUserId?: string;
  escalateToUser?: { id: string; firstName: string; lastName: string };
  metadata?: Record<string, unknown>;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationLog {
  id: string;
  ruleId?: string;
  rule?: EscalationRule;
  taskId?: string;
  task?: { id: string; title: string };
  projectId?: string;
  project?: { id: string; name: string };
  action: EscalationAction;
  status: EscalationLogStatus;
  actionDetail?: string;
  notifiedUsers?: string[];
  escalatedToUserId?: string;
  errorMessage?: string;
  executedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateEscalationRuleInput {
  name: string;
  description?: string;
  projectId?: string;
  triggerType: EscalationTriggerType;
  triggerValue: number;
  action: EscalationAction;
  status?: EscalationRuleStatus;
  priority?: number;
  notifyEmails?: string[];
  escalateToUserId?: string;
}

export interface UpdateEscalationRuleInput extends Partial<CreateEscalationRuleInput> {}

interface BackendResponse<T> {
  success: boolean;
  data: T;
}

interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

function extractData<T>(response: BackendResponse<T>): T {
  return response.data;
}

export const escalationService = {
  async getRules(params?: { status?: EscalationRuleStatus }): Promise<PaginatedData<EscalationRule>> {
    const queryParams = new URLSearchParams();
    queryParams.set('limit', '100');
    if (params?.status) queryParams.set('status', params.status);
    const response = await api.get<BackendResponse<PaginatedData<EscalationRule>>>(`/escalations/rules?${queryParams}`);
    return extractData(response);
  },

  async getRule(id: string): Promise<EscalationRule> {
    const response = await api.get<BackendResponse<EscalationRule>>(`/escalations/rules/${id}`);
    return extractData(response);
  },

  async createRule(input: CreateEscalationRuleInput): Promise<EscalationRule> {
    const response = await api.post<BackendResponse<EscalationRule>>('/escalations/rules', input);
    return extractData(response);
  },

  async updateRule(id: string, input: UpdateEscalationRuleInput): Promise<EscalationRule> {
    const response = await api.patch<BackendResponse<EscalationRule>>(`/escalations/rules/${id}`, input);
    return extractData(response);
  },

  async deleteRule(id: string): Promise<void> {
    await api.delete(`/escalations/rules/${id}`);
  },

  async getLogs(params?: { pageSize?: number }): Promise<PaginatedData<EscalationLog>> {
    const queryParams = new URLSearchParams();
    queryParams.set('limit', String(params?.pageSize || 50));
    const response = await api.get<BackendResponse<PaginatedData<EscalationLog>>>(`/escalations/logs?${queryParams}`);
    return extractData(response);
  },

  async getStatistics(): Promise<Record<string, unknown>> {
    const response = await api.get<BackendResponse<Record<string, unknown>>>('/escalations/statistics');
    return extractData(response);
  },
};
