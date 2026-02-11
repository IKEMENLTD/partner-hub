import { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Phone,
  Send,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { Card, CardHeader, CardContent, Button, Input } from '@/components/common';
import { systemSettingsService } from '@/services/systemSettingsService';
import type { SystemSettings, UpdateSystemSettingsInput } from '@/services/systemSettingsService';

export function AdminSettingsPage() {
  const { user } = useAuthStore();
  const [, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');

  // フォーム状態
  const [formData, setFormData] = useState<UpdateSystemSettingsInput>({
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
  });

  // 設定を取得
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const data = await systemSettingsService.getSettings();
        setSettings(data);
        setFormData({
          twilioAccountSid: data.twilioAccountSid || '',
          twilioAuthToken: data.twilioAuthToken || '',
          twilioPhoneNumber: data.twilioPhoneNumber || '',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : '設定の取得に失敗しました';
        setError(message);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // 設定を保存
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      const payload: UpdateSystemSettingsInput = {};
      if (formData.twilioAccountSid?.trim()) payload.twilioAccountSid = formData.twilioAccountSid.trim();
      if (formData.twilioAuthToken?.trim()) payload.twilioAuthToken = formData.twilioAuthToken.trim();
      if (formData.twilioPhoneNumber?.trim()) payload.twilioPhoneNumber = formData.twilioPhoneNumber.trim();
      await systemSettingsService.updateSettings(payload);
      setSuccess('設定を保存しました');
    } catch (err) {
      const message = err instanceof Error ? err.message : '設定の保存に失敗しました';
      setError(message);
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // テストSMS送信
  const handleTestSms = async () => {
    if (!testPhoneNumber.trim()) {
      setTestResult({ success: false, message: '送信先の電話番号を入力してください' });
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      const result = await systemSettingsService.testSms(testPhoneNumber.trim());
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, message: 'テスト送信に失敗しました' });
      console.error(err);
    } finally {
      setIsTesting(false);
    }
  };

  // 権限チェック
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">アクセス権限がありません</h2>
          <p className="text-gray-600">この設定ページは管理者のみアクセスできます。</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">システム設定</h1>
          <p className="mt-1 text-gray-600">
            組織全体の通知設定を管理します（管理者のみ）
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          保存
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* SMS設定 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-gray-500" />
              <span>SMS連携（Twilio）</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account SID
              </label>
              <Input
                type="text"
                value={formData.twilioAccountSid}
                onChange={(e) =>
                  setFormData({ ...formData, twilioAccountSid: e.target.value })
                }
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="mt-1 text-xs text-gray-500">
                「AC」で始まる34文字の文字列です
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auth Token
              </label>
              <Input
                type="password"
                value={formData.twilioAuthToken}
                onChange={(e) =>
                  setFormData({ ...formData, twilioAuthToken: e.target.value })
                }
                placeholder="32文字の英数字"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                送信元電話番号
              </label>
              <Input
                type="tel"
                value={formData.twilioPhoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, twilioPhoneNumber: e.target.value })
                }
                placeholder="+815012345678"
              />
              <p className="mt-1 text-xs text-gray-500">
                Twilioで購入した電話番号を「+81...」形式で入力
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-amber-700">
                SMS送信はコストが発生するため、エスカレーション（タスク期限超過）の緊急連絡としてパートナーに送信されます。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* セットアップガイド + テスト */}
        <div className="space-y-6">
          {/* セットアップガイド */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-gray-500" />
                <span>セットアップ手順</span>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 font-bold text-primary-600">1.</span>
                  <span>
                    <a
                      href="https://www.twilio.com/try-twilio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline inline-flex items-center gap-1"
                    >
                      Twilioアカウントを作成
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    （無料トライアルあり）
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 font-bold text-primary-600">2.</span>
                  <span>
                    <a
                      href="https://console.twilio.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline inline-flex items-center gap-1"
                    >
                      Twilioコンソール
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    のトップページに表示される「Account SID」と「Auth Token」をコピー
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 font-bold text-primary-600">3.</span>
                  <span>
                    コンソールの「Phone Numbers」→「Buy a Number」から日本の電話番号を購入（SMS対応のもの）
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 font-bold text-primary-600">4.</span>
                  <span>左側のフォームに3つの値を入力して「保存」をクリック</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 font-bold text-primary-600">5.</span>
                  <span>下のテスト送信で動作確認</span>
                </li>
              </ol>

              <div className="mt-4 rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-700">
                  無料トライアルでは、事前に認証した電話番号にのみSMSを送信できます。
                  本番利用にはアカウントのアップグレードが必要です。
                </p>
              </div>
            </CardContent>
          </Card>

          {/* テスト送信 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-gray-500" />
                <span>テスト送信</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                設定を保存したあと、テストSMSを送信して動作を確認できます。
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  送信先電話番号
                </label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="09012345678"
                    className="flex-1"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleTestSms}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {testResult && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                    testResult.success
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
