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

      {/* セットアップガイド（全幅で上部に配置） */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            <span>SMS連携セットアップガイド</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            タスク期限超過時、パートナーの登録電話番号にSMSで緊急連絡します。
            SMS送信には
            <a
              href="https://www.twilio.com/ja-jp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 underline inline-flex items-center gap-0.5 mx-1"
            >
              Twilio
              <ExternalLink className="h-3 w-3" />
            </a>
            のアカウントが必要です。
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {/* ステップ1〜3: アカウント準備 */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">アカウント準備</h4>

              <div className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">1</span>
                <div className="text-sm text-gray-700">
                  <a
                    href="https://www.twilio.com/try-twilio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 underline inline-flex items-center gap-0.5 font-medium"
                  >
                    Twilioアカウントを作成
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-gray-500 mt-0.5">
                    メールアドレスで無料登録。トライアルクレジット付きですぐに試せます。
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">2</span>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Account SID と Auth Token を確認</span>
                  <p className="text-gray-500 mt-0.5">
                    <a
                      href="https://console.twilio.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline inline-flex items-center gap-0.5"
                    >
                      Twilioコンソール
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    にログイン →「Account Info」セクションに表示されています。
                    Auth Tokenは目のアイコンをクリックで表示されます。
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">3</span>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">送信元電話番号を取得</span>
                  <p className="text-gray-500 mt-0.5">
                    コンソール → 「Phone Numbers」→「Buy a Number」。
                    日本番号は法人の規制バンドル申請（登記簿等）が必要なため、
                    まずは<strong>米国番号（+1）</strong>が手軽です。
                    米国番号から日本宛SMSの送信が可能です（$0.084/通）。
                  </p>
                </div>
              </div>
            </div>

            {/* ステップ4〜5: 設定 & テスト */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">設定 & 確認</h4>

              <div className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">4</span>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">下のフォームに3つの値を入力</span>
                  <p className="text-gray-500 mt-0.5">
                    Account SID、Auth Token、購入した電話番号を入力して「保存」をクリック。
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">5</span>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">テスト送信で動作確認</span>
                  <p className="text-gray-500 mt-0.5">
                    下部の「テスト送信」から自分の番号を入れてSMSが届くか確認してください。
                  </p>
                </div>
              </div>

              {/* 注意事項 */}
              <div className="mt-2 space-y-2">
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs font-medium text-amber-800 mb-1">無料トライアルの制限</p>
                  <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                    <li>事前に「Verified Caller IDs」に登録した番号にのみ送信可能</li>
                    <li>送信メッセージの先頭に「Sent from your Twilio trial account」が付きます</li>
                    <li>本番利用にはアカウントのアップグレード（従量課金）が必要</li>
                  </ul>
                </div>

                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">料金目安</p>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    <li>米国番号: 月額 $1.15 + 日本宛SMS $0.084/通</li>
                    <li>日本番号（050）: 月額 $4.50 + SMS $0.12/通（別途規制バンドル申請が必要）</li>
                    <li>SMSは160文字/セグメント。日本語はUCS-2エンコードのため約70文字/セグメント</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* SMS設定フォーム */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-gray-500" />
              <span>Twilio認証情報</span>
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
                「AC」で始まる34文字の文字列（コンソールのAccount Infoに表示）
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
              <p className="mt-1 text-xs text-gray-500">
                コンソールで目のアイコンをクリックして表示（パスワードと同様に管理してください）
              </p>
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
                placeholder="+12025551234（米国番号の例）"
              />
              <p className="mt-1 text-xs text-gray-500">
                Twilioで購入した電話番号をE.164形式（+国番号...）で入力
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-700">
                この設定が完了すると、タスク期限超過のエスカレーション発生時に、
                パートナーの登録電話番号へ自動的にSMSが送信されます。
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
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              設定を保存したあと、テストSMSを送信して正しく届くか確認できます。
            </p>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-700">
                <strong>トライアルアカウントの場合: </strong>
                送信先を事前にTwilioコンソールの
                <a
                  href="https://console.twilio.com/us1/develop/phone-numbers/manage/verified"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium inline-flex items-center gap-0.5"
                >
                  Verified Caller IDs
                  <ExternalLink className="h-3 w-3" />
                </a>
                に登録してください。未登録の番号には送信できません。
              </p>
            </div>

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
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      送信
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                国内番号（09012345678）でも国際形式（+819012345678）でもOK
              </p>
            </div>

            {testResult && (
              <div
                className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  testResult.success
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p>{testResult.message}</p>
                  {!testResult.success && (
                    <p className="mt-1 text-xs opacity-80">
                      よくある原因: Account SID/Auth Tokenの入力ミス、未認証の送信先番号（トライアル）、
                      送信元番号のSMS未対応
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
