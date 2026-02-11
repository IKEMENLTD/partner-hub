import { api, extractData } from './api';

export interface SystemSettings {
  id: string;
  organizationId: string;
  slackWebhookUrl: string | null;
  slackChannelName: string | null;
  slackNotifyEscalation: boolean;
  slackNotifyDailySummary: boolean;
  slackNotifyAllReminders: boolean;
  lineChannelAccessToken: string | null;
  lineChannelSecret: string | null;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioPhoneNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSystemSettingsInput {
  slackWebhookUrl?: string;
  slackChannelName?: string;
  slackNotifyEscalation?: boolean;
  slackNotifyDailySummary?: boolean;
  slackNotifyAllReminders?: boolean;
  lineChannelAccessToken?: string;
  lineChannelSecret?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
}

export interface SlackTestResult {
  success: boolean;
  message: string;
}

interface BackendResponse<T> {
  success: boolean;
  data: T;
}

export const systemSettingsService = {
  /**
   * システム設定を取得
   */
  async getSettings(): Promise<SystemSettings> {
    const response = await api.get<BackendResponse<SystemSettings>>('/system-settings');
    return extractData(response);
  },

  /**
   * システム設定を更新
   */
  async updateSettings(input: UpdateSystemSettingsInput): Promise<SystemSettings> {
    const response = await api.put<BackendResponse<SystemSettings>>('/system-settings', input);
    return extractData(response);
  },

  /**
   * Slack Webhook URLをテスト
   * ※ レスポンスにsuccessフィールドがあるため、TransformInterceptorがラップしない
   */
  async testSlackWebhook(webhookUrl: string): Promise<SlackTestResult> {
    return api.post<SlackTestResult>('/system-settings/test-slack', { webhookUrl });
  },
};
