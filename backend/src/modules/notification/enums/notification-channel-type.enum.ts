export enum NotificationChannelType {
  EMAIL = 'email',
  SLACK = 'slack',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum NotificationType {
  REMINDER = 'reminder',
  ESCALATION = 'escalation',
  TASK_UPDATE = 'task_update',
  PROJECT_UPDATE = 'project_update',
  SYSTEM = 'system',
}
