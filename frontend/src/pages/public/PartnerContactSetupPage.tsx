import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mail,
  MessageCircle,
  Phone,
  Loader2,
  AlertCircle,
  CheckCircle,
  Building,
  User,
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/common';
import { partnerContactSetupService } from '@/services/partnerContactSetupService';
import type {
  TokenVerifyResult,
  PreferredChannel,
  PartnerContactSetupInput,
} from '@/services/partnerContactSetupService';

export function PartnerContactSetupPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // フォーム状態
  const [preferredChannel, setPreferredChannel] = useState<PreferredChannel>('email');
  const [smsPhoneNumber, setSmsPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // トークン検証
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('無効なURLです');
        setIsLoading(false);
        return;
      }

      try {
        const result = await partnerContactSetupService.verifyToken(token);
        setTokenInfo(result);
        if (!result.valid) {
          setError(result.message || '無効なトークンです');
        }
      } catch (err) {
        setError('トークンの検証に失敗しました');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  // 電話番号バリデーション
  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) {
      setPhoneError('電話番号は必須です');
      return false;
    }
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (!/^[0-9+]+$/.test(cleaned)) {
      setPhoneError('有効な電話番号を入力してください');
      return false;
    }
    if (cleaned.length < 10 || cleaned.length > 15) {
      setPhoneError('電話番号の桁数が正しくありません');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhoneNumber(smsPhoneNumber)) {
      return;
    }

    if (!token) {
      setError('無効なトークンです');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const input: PartnerContactSetupInput = {
        preferredChannel,
        smsPhoneNumber,
      };

      const result = await partnerContactSetupService.completeSetup(token, input);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || '設定の保存に失敗しました');
      }
    } catch (err) {
      setError('設定の保存に失敗しました');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ローディング
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // エラー状態（トークン無効など）
  if (error && !tokenInfo?.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">エラー</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">
              担当者に連絡して、新しいセットアップメールの送信を依頼してください。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 完了状態
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">設定完了</h2>
            <p className="text-gray-600 mb-6">
              連絡先の設定が完了しました。<br />
              今後の通知は設定いただいた方法でお届けします。
            </p>
            <Button onClick={() => navigate('/login')}>ログイン画面へ</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            連絡先の登録
          </h1>
          <p className="mt-2 text-gray-600">
            重要なご連絡が確実に届くよう、連絡先の登録をお願いします。
          </p>
        </div>

        {/* パートナー情報 */}
        {tokenInfo?.partner && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                    {tokenInfo.partner.companyName ? (
                      <Building className="h-6 w-6 text-primary-600" />
                    ) : (
                      <User className="h-6 w-6 text-primary-600" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{tokenInfo.partner.name}</p>
                  {tokenInfo.partner.companyName && (
                    <p className="text-sm text-gray-500">{tokenInfo.partner.companyName}</p>
                  )}
                  <p className="text-sm text-gray-500">{tokenInfo.partner.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* フォーム */}
        <Card>
          <CardContent className="py-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 通常連絡用チャネル */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  通常連絡用の方法を選択してください
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPreferredChannel('email')}
                    className={`p-4 rounded-lg border-2 text-center transition-colors ${
                      preferredChannel === 'email'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Mail
                      className={`h-8 w-8 mx-auto mb-2 ${
                        preferredChannel === 'email' ? 'text-primary-600' : 'text-gray-400'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        preferredChannel === 'email' ? 'text-primary-700' : 'text-gray-700'
                      }`}
                    >
                      メール
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreferredChannel('line')}
                    className={`p-4 rounded-lg border-2 text-center transition-colors ${
                      preferredChannel === 'line'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <MessageCircle
                      className={`h-8 w-8 mx-auto mb-2 ${
                        preferredChannel === 'line' ? 'text-green-600' : 'text-gray-400'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        preferredChannel === 'line' ? 'text-green-700' : 'text-gray-700'
                      }`}
                    >
                      LINE
                    </span>
                  </button>
                </div>

                {preferredChannel === 'line' && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">
                      LINE通知をご利用いただくには、設定完了後に表示される
                      QRコードからLINE公式アカウントを友達追加してください。
                    </p>
                  </div>
                )}
              </div>

              {/* 緊急連絡先（電話番号） */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  <Phone className="h-4 w-4 inline-block mr-1" />
                  緊急連絡先（電話番号）
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  エスカレーション発生時のSMS送信先として使用します
                </p>
                <Input
                  type="tel"
                  value={smsPhoneNumber}
                  onChange={(e) => {
                    setSmsPhoneNumber(e.target.value);
                    if (phoneError) validatePhoneNumber(e.target.value);
                  }}
                  onBlur={() => validatePhoneNumber(smsPhoneNumber)}
                  placeholder="09012345678"
                  className={phoneError ? 'border-red-500' : ''}
                />
                {phoneError && (
                  <p className="mt-1 text-sm text-red-500">{phoneError}</p>
                )}
              </div>

              {/* エラーメッセージ */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* 送信ボタン */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    設定中...
                  </>
                ) : (
                  '設定を完了する'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 注意事項 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            ご登録いただいた連絡先は、プロジェクトに関する重要な通知のみに使用されます。
          </p>
        </div>
      </div>
    </div>
  );
}
