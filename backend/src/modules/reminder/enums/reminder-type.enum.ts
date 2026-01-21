export enum ReminderType {
  TASK_DUE = 'task_due',
  PROJECT_DEADLINE = 'project_deadline',
  TASK_OVERDUE = 'task_overdue',
  PROJECT_OVERDUE = 'project_overdue',
  PROJECT_STAGNANT = 'project_stagnant',
  STATUS_UPDATE_REQUEST = 'status_update_request',
  PARTNER_ACTIVITY = 'partner_activity',
  CUSTOM = 'custom',
}

export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ReminderChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
  SLACK = 'slack',
  BOTH = 'both',
  ALL = 'all',
}
