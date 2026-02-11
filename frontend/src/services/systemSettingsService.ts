import { api, extractData } from './api';

export interface SystemSettings {
  id: string;
  organizationId: string;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioPhoneNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSystemSettingsInput {
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
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
};
