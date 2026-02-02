import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_settings')
export class SystemSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 組織ID（マルチテナント対応）
  @Column({ name: 'organization_id', type: 'uuid', unique: true })
  organizationId: string;

  // Slack設定
  @Column({ name: 'slack_webhook_url', nullable: true })
  slackWebhookUrl: string;

  @Column({ name: 'slack_channel_name', nullable: true })
  slackChannelName: string;

  @Column({ name: 'slack_notify_escalation', default: true })
  slackNotifyEscalation: boolean;

  @Column({ name: 'slack_notify_daily_summary', default: true })
  slackNotifyDailySummary: boolean;

  @Column({ name: 'slack_notify_all_reminders', default: false })
  slackNotifyAllReminders: boolean;

  // LINE設定（将来用）
  @Column({ name: 'line_channel_access_token', nullable: true })
  lineChannelAccessToken: string;

  @Column({ name: 'line_channel_secret', nullable: true })
  lineChannelSecret: string;

  // SMS設定（Twilio - 将来用）
  @Column({ name: 'twilio_account_sid', nullable: true })
  twilioAccountSid: string;

  @Column({ name: 'twilio_auth_token', nullable: true })
  twilioAuthToken: string;

  @Column({ name: 'twilio_phone_number', nullable: true })
  twilioPhoneNumber: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
