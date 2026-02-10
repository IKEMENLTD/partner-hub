import { api } from './api';

export interface Reminder {
  id: string;
  title: string;
  message?: string;
  type: ReminderType;
  status: ReminderStatus;
  channel: ReminderChannel;
  userId: string;
  taskId?: string;
  projectId?: string;
  scheduledAt: string;
  sentAt?: string;
  isRead: boolean;
  retryCount: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReminderType =
  | 'task_due'
  | 'project_deadline'
  | 'task_overdue'
  | 'project_overdue'
  | 'project_stagnant'
  | 'status_update_request'
  | 'partner_activity'
  | 'custom';

export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export type ReminderChannel = 'email' | 'in_app' | 'slack' | 'both' | 'all';

interface BackendResponse<T> {
  success: boolean;
  data: T;
}

function extractData<T>(response: BackendResponse<T>): T {
  return response.data;
}

export const reminderService = {
  async getMyReminders(unreadOnly?: boolean): Promise<Reminder[]> {
    const params = unreadOnly ? '?unreadOnly=true' : '';
    const response = await api.get<BackendResponse<Reminder[]>>(`/reminders/my${params}`);
    return extractData(response);
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get<BackendResponse<{ count: number }>>('/reminders/my/unread-count');
    return extractData(response).count;
  },

  async markAsRead(id: string): Promise<Reminder> {
    const response = await api.patch<BackendResponse<Reminder>>(`/reminders/${id}/read`);
    return extractData(response);
  },

  async markAllAsRead(): Promise<void> {
    await api.post<BackendResponse<{ message: string }>>('/reminders/my/mark-all-read');
  },

  async cancel(id: string): Promise<Reminder> {
    const response = await api.patch<BackendResponse<Reminder>>(`/reminders/${id}/cancel`);
    return extractData(response);
  },
};
