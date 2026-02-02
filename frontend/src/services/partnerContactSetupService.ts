import { api } from './api';

export type PreferredChannel = 'email' | 'line';

export interface PartnerContactSetupInput {
  preferredChannel: PreferredChannel;
  lineUserId?: string;
  smsPhoneNumber: string;
}

export interface TokenVerifyResult {
  valid: boolean;
  partner?: {
    id: string;
    name: string;
    email: string;
    companyName?: string;
  };
  expiresAt?: string;
  message?: string;
}

export interface ContactSetupResult {
  success: boolean;
  message: string;
  partner?: {
    id: string;
    name: string;
    email: string;
    preferredChannel: PreferredChannel;
  };
}

export const partnerContactSetupService = {
  /**
   * トークンを検証してパートナー情報を取得
   */
  async verifyToken(token: string): Promise<TokenVerifyResult> {
    return api.get<TokenVerifyResult>(
      `/partner-contact-setup/verify/${token}`,
      true // skipAuth - 公開エンドポイント
    );
  },

  /**
   * 連絡先設定を完了
   */
  async completeSetup(
    token: string,
    input: PartnerContactSetupInput
  ): Promise<ContactSetupResult> {
    return api.post<ContactSetupResult>(
      `/partner-contact-setup/complete/${token}`,
      input,
      true // skipAuth - 公開エンドポイント
    );
  },
};
