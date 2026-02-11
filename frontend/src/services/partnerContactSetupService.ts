import { api, extractData } from './api';

export type PreferredChannel = 'email';

export interface PartnerContactSetupInput {
  preferredChannel: PreferredChannel;
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
    const response = await api.get<{ success: boolean; data: TokenVerifyResult }>(
      `/partner-contact-setup/verify/${token}`,
      true // skipAuth - 公開エンドポイント
    );
    return extractData(response);
  },

  /**
   * 連絡先設定を完了
   * ※ レスポンスDTOにsuccessフィールドがあるため、TransformInterceptorがラップしない
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
