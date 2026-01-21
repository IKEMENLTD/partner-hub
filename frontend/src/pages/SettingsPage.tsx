import { useState } from 'react';
import {
  Settings,
  Globe,
  Bell,
  Moon,
  User,
  Shield,
  Save,
  Mail,
  Clock,
} from 'lucide-react';
import { useAuthStore, useUIStore } from '@/store';
import { getUserDisplayName } from '@/types';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Select,
} from '@/components/common';

export function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useUIStore();

  // User preferences state
  const [language, setLanguage] = useState('ja');
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationPush, setNotificationPush] = useState(true);
  const [notificationDeadline, setNotificationDeadline] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Digest email settings
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestTime, setDigestTime] = useState('07:00');

  const handleSavePreferences = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">設定</h1>
          <p className="mt-1 text-gray-600">
            アプリケーションの設定を管理します
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Language & Region */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-gray-500" />
                <span>言語と地域</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="表示言語"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                options={[
                  { value: 'ja', label: '日本語' },
                  { value: 'en', label: 'English' },
                ]}
              />
              <p className="text-sm text-gray-500">
                アプリケーションの表示言語を選択します。変更は次回ログイン時に適用されます。
              </p>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-gray-500" />
                <span>通知設定</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">メール通知</p>
                  <p className="text-sm text-gray-500">
                    重要な更新をメールで受け取ります
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationEmail}
                  onClick={() => setNotificationEmail(!notificationEmail)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    notificationEmail ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notificationEmail ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">プッシュ通知</p>
                  <p className="text-sm text-gray-500">
                    ブラウザでプッシュ通知を受け取ります
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationPush}
                  onClick={() => setNotificationPush(!notificationPush)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    notificationPush ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notificationPush ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">期限リマインダー</p>
                  <p className="text-sm text-gray-500">
                    タスクの期限が近づくと通知を受け取ります
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationDeadline}
                  onClick={() => setNotificationDeadline(!notificationDeadline)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    notificationDeadline ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notificationDeadline ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Digest Email Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-gray-500" />
                <span>ダイジェストメール</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">デイリーダイジェスト</p>
                  <p className="text-sm text-gray-500">
                    毎日のタスクサマリーをメールで受け取ります
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={digestEnabled}
                  onClick={() => setDigestEnabled(!digestEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    digestEnabled ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      digestEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {digestEnabled && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">配信時刻</p>
                  </div>
                  <Select
                    value={digestTime}
                    onChange={(e) => setDigestTime(e.target.value)}
                    options={[
                      { value: '06:00', label: '6:00' },
                      { value: '07:00', label: '7:00' },
                      { value: '08:00', label: '8:00' },
                      { value: '09:00', label: '9:00' },
                    ]}
                  />
                </div>
              )}

              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-700">
                  ダイジェストメールには、本日のタスク、期限超過タスク、未読通知のサマリーが含まれます。
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-gray-500" />
                <span>表示設定</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">ダークモード</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    暗い配色のテーマを使用します
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme === 'dark'}
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    theme === 'dark' ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              leftIcon={<Save className="h-4 w-4" />}
              onClick={handleSavePreferences}
              isLoading={isSaving}
            >
              設定を保存
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-500" />
                <span>アカウント情報</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">名前</span>
                <span className="text-gray-900">{getUserDisplayName(user)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">メール</span>
                <span className="text-gray-900">{user?.email || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">権限</span>
                <span className="text-gray-900">
                  {user?.role === 'admin'
                    ? '管理者'
                    : user?.role === 'manager'
                    ? 'マネージャー'
                    : user?.role === 'partner'
                    ? 'パートナー'
                    : 'メンバー'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-gray-500" />
                <span>セキュリティ</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                セキュリティ設定は管理者にお問い合わせください。
              </p>
              <Button variant="outline" size="sm" className="w-full">
                パスワードを変更
              </Button>
            </CardContent>
          </Card>

          {/* Help */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-500" />
                <span>ヘルプ</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <a
                href="#"
                className="block text-primary-600 hover:text-primary-700"
              >
                ヘルプセンター
              </a>
              <a
                href="#"
                className="block text-primary-600 hover:text-primary-700"
              >
                お問い合わせ
              </a>
              <a
                href="#"
                className="block text-primary-600 hover:text-primary-700"
              >
                利用規約
              </a>
              <a
                href="#"
                className="block text-primary-600 hover:text-primary-700"
              >
                プライバシーポリシー
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
