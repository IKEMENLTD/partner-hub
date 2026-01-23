export enum EscalationAction {
  NOTIFY_OWNER = 'notify_owner',
  NOTIFY_STAKEHOLDERS = 'notify_stakeholders',
  ESCALATE_TO_MANAGER = 'escalate_to_manager',
}

export enum EscalationTriggerType {
  DAYS_BEFORE_DUE = 'days_before_due',
  DAYS_AFTER_DUE = 'days_after_due',
  PROGRESS_BELOW = 'progress_below',
}

export enum EscalationRuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum EscalationLogStatus {
  PENDING = 'pending',
  EXECUTED = 'executed',
  FAILED = 'failed',
}
