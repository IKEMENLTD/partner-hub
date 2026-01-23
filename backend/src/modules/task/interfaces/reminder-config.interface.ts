export interface ReminderConfig {
  advanceReminderDays?: number; // 何日前に通知
  dueDayReminder?: boolean; // 期限当日リマインド
  escalation?: {
    enabled: boolean;
    daysAfterDue: number; // 期限超過後何日でエスカレーション
    escalateTo?: string[]; // エスカレーション先のユーザーID
  };
}
