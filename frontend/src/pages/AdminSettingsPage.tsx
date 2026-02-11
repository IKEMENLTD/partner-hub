import { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Phone,
  Send,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { Card, CardHeader, CardContent, Button, Input } from '@/components/common';
import { systemSettingsService } from '@/services/systemSettingsService';
import type { SystemSettings, UpdateSystemSettingsInput } from '@/services/systemSettingsService';

// トグルスイッチコンポーネント
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
        checked ? 'bg-primary-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function AdminSettingsPage() {
  const { user } = useAuthStore();
  const [, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // フォーム状態
  const [formData, setFormData] = useState<UpdateSystemSettingsInput>({
    slackWebhookUrl: '',
    slackChannelName: '',
    slackNotifyEscalation: true,
    slackNotifyDailySummary: true,
    slackNotifyAllReminders: false,
    lineChannelAccessToken: '',
    lineChannelSecret: '',
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
          slackWebhookUrl: data.slackWebhookUrl || '',
          slackChannelName: data.slackChannelName || '',
          slackNotifyEscalation: data.slackNotifyEscalation,
          slackNotifyDailySummary: data.slackNotifyDailySummary,
          slackNotifyAllReminders: data.slackNotifyAllReminders,
          lineChannelAccessToken: data.lineChannelAccessToken || '',
          lineChannelSecret: data.lineChannelSecret || '',
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
      // 空文字をundefinedに変換（バリデーションエラー回避）
      const payload: UpdateSystemSettingsInput = {
        slackNotifyEscalation: formData.slackNotifyEscalation,
        slackNotifyDailySummary: formData.slackNotifyDailySummary,
        slackNotifyAllReminders: formData.slackNotifyAllReminders,
      };
      if (formData.slackWebhookUrl?.trim()) payload.slackWebhookUrl = formData.slackWebhookUrl.trim();
      if (formData.slackChannelName?.trim()) payload.slackChannelName = formData.slackChannelName.trim();
      if (formData.lineChannelAccessToken?.trim()) payload.lineChannelAccessToken = formData.lineChannelAccessToken.trim();
      if (formData.lineChannelSecret?.trim()) payload.lineChannelSecret = formData.lineChannelSecret.trim();
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

  // Slack Webhookテスト
  const handleTestSlack = async () => {
    if (!formData.slackWebhookUrl) {
      setTestResult({ success: false, message: 'Webhook URLを入力してください' });
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      const result = await systemSettingsService.testSlackWebhook(formData.slackWebhookUrl);
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
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
          <CheckCircle className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Slack設定 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-gray-500" />
              <span>Slack連携</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL
              </label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={formData.slackWebhookUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, slackWebhookUrl: e.target.value })
                  }
                  placeholder="https://hooks.slack.com/services/..."
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={handleTestSlack}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {testResult && (
                <p
                  className={`mt-2 text-sm ${
                    testResult.success ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {testResult.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                通知先チャンネル名（表示用）
              </label>
              <Input
                type="text"
                value={formData.slackChannelName}
                onChange={(e) =>
                  setFormData({ ...formData, slackChannelName: e.target.value })
                }
                placeholder="#案件アラート"
              />
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-900">通知する内容</h4>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">エスカレーション発生時</span>
                <ToggleSwitch
                  checked={formData.slackNotifyEscalation ?? true}
                  onChange={(checked) =>
                    setFormData({ ...formData, slackNotifyEscalation: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">期限超過タスク（日次サマリー）</span>
                <ToggleSwitch
                  checked={formData.slackNotifyDailySummary ?? true}
                  onChange={(checked) =>
                    setFormData({ ...formData, slackNotifyDailySummary: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">全てのリマインド送信時</span>
                <ToggleSwitch
                  checked={formData.slackNotifyAllReminders ?? false}
                  onChange={(checked) =>
                    setFormData({ ...formData, slackNotifyAllReminders: checked })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LINE設定 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <span>LINE連携</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel Access Token
              </label>
              <Input
                type="password"
                value={formData.lineChannelAccessToken}
                onChange={(e) =>
                  setFormData({ ...formData, lineChannelAccessToken: e.target.value })
                }
                placeholder="LINE Developersで取得"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel Secret
              </label>
              <Input
                type="password"
                value={formData.lineChannelSecret}
                onChange={(e) =>
                  setFormData({ ...formData, lineChannelSecret: e.target.value })
                }
                placeholder="LINE Developersで取得"
              />
            </div>
          </CardContent>
        </Card>

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
                placeholder="Twilioダッシュボードで確認"
              />
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
                placeholder="Twilioダッシュボードで確認"
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
                placeholder="+81..."
              />
            </div>

            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-amber-700">
                SMS送信はコストが発生するため、エスカレーションの最終手段として使用されます。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
