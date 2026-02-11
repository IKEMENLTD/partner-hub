import { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Phone,
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      // 空文字をundefinedに変換（バリデーションエラー回避）
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
  );
}
