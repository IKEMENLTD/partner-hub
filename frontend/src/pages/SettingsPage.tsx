import { useState, useEffect } from 'react';
import {
  Settings,
  Globe,
  Bell,
  Moon,
  User,
  Save,
  Mail,
  Clock,
  AlertCircle,
  UserCheck,
  AtSign,
  RefreshCw,
  Loader2,
  HelpCircle,
  MessageCircle,
  FileText,
  Lock,
  Building2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore, useUIStore } from '@/store';
import { getUserDisplayName } from '@/types';
import type { DigestTime, NotificationSettingsInput } from '@/types';
import {
  Card,
  CardHeader,
  CardContent,
  Select,
} from '@/components/common';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '@/hooks';
import {
  HelpCenterModal,
  ContactModal,
  TermsModal,
  PrivacyPolicyModal,
} from '@/components/settings';

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

// 通知設定アイテムコンポーネント
interface NotificationItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function NotificationItem({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: NotificationItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-gray-400">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useUIStore();

  // User preferences state
  const [language, setLanguage] = useState('ja');

  // Help modals state
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // 通知設定フック
  const { data: notificationSettings, isLoading: isLoadingSettings } =
    useNotificationSettings();
  const updateSettingsMutation = useUpdateNotificationSettings();

  // ローカル状態 (API取得前のフォールバック用)
  const [localSettings, setLocalSettings] = useState({
    emailNotification: true,
    pushNotification: true,
    inAppNotification: true,
    digestEnabled: true,
    digestTime: '07:00' as DigestTime,
    deadlineNotification: true,
    assigneeChangeNotification: true,
    mentionNotification: true,
    statusChangeNotification: true,
    reminderMaxCount: 3,
  });

  // API取得したデータでローカル状態を更新
  useEffect(() => {
    if (notificationSettings) {
      setLocalSettings({
        emailNotification: notificationSettings.emailNotification,
        pushNotification: notificationSettings.pushNotification,
        inAppNotification: notificationSettings.inAppNotification,
        digestEnabled: notificationSettings.digestEnabled,
        digestTime: notificationSettings.digestTime,
        deadlineNotification: notificationSettings.deadlineNotification,
        assigneeChangeNotification: notificationSettings.assigneeChangeNotification,
        mentionNotification: notificationSettings.mentionNotification,
        statusChangeNotification: notificationSettings.statusChangeNotification,
        reminderMaxCount: notificationSettings.reminderMaxCount,
      });
    }
  }, [notificationSettings]);

  // 設定更新ハンドラ
  const handleSettingChange = async (
    key: keyof NotificationSettingsInput,
    value: boolean | string | number
  ) => {
    // 楽観的更新
    setLocalSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    // API呼び出し
    try {
      await updateSettingsMutation.mutateAsync({
        [key]: value,
      });
    } catch (error) {
      // エラー時は元に戻す
      if (notificationSettings) {
        setLocalSettings({
          emailNotification: notificationSettings.emailNotification,
          pushNotification: notificationSettings.pushNotification,
          inAppNotification: notificationSettings.inAppNotification,
          digestEnabled: notificationSettings.digestEnabled,
          digestTime: notificationSettings.digestTime,
          deadlineNotification: notificationSettings.deadlineNotification,
          assigneeChangeNotification: notificationSettings.assigneeChangeNotification,
          mentionNotification: notificationSettings.mentionNotification,
          statusChangeNotification: notificationSettings.statusChangeNotification,
          reminderMaxCount: notificationSettings.reminderMaxCount,
        });
      }
      console.error('Failed to update notification settings:', error);
    }
  };

  // リマインド上限の選択肢を生成
  const reminderMaxCountOptions = Array.from({ length: 10 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}回`,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
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
                  { value: 'en', label: 'English（未実装）', disabled: true },
                ]}
              />
              <p className="text-sm text-gray-500">
                アプリケーションの表示言語を選択します。
              </p>
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs text-amber-700">
                  英語版は現在開発中です。対応次第、選択可能になります。
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Basic Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-gray-500" />
                <span>基本通知設定</span>
                {isLoadingSettings && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                )}
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
                <ToggleSwitch
                  checked={localSettings.emailNotification}
                  onChange={(checked) =>
                    handleSettingChange('emailNotification', checked)
                  }
                  disabled={isLoadingSettings}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">アプリ内通知</p>
                  <p className="text-sm text-gray-500">
                    アプリ内のベルアイコンで通知を受け取ります
                  </p>
                </div>
                <ToggleSwitch
                  checked={localSettings.inAppNotification}
                  onChange={(checked) =>
                    handleSettingChange('inAppNotification', checked)
                  }
                  disabled={isLoadingSettings}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-gray-500" />
                <span>通知種別設定</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <NotificationItem
                icon={<AlertCircle className="h-4 w-4" />}
                title="期限通知"
                description="タスクの期限が近づくと通知を受け取ります"
                checked={localSettings.deadlineNotification}
                onChange={(checked) =>
                  handleSettingChange('deadlineNotification', checked)
                }
                disabled={isLoadingSettings}
              />

              <NotificationItem
                icon={<AtSign className="h-4 w-4" />}
                title="メンション通知"
                description="コメントでメンションされると通知を受け取ります"
                checked={localSettings.mentionNotification}
                onChange={(checked) =>
                  handleSettingChange('mentionNotification', checked)
                }
                disabled={isLoadingSettings}
              />

              <NotificationItem
                icon={<UserCheck className="h-4 w-4" />}
                title="担当者アサイン通知"
                description="自分がタスクの担当者に設定されると通知を受け取ります"
                checked={localSettings.assigneeChangeNotification}
                onChange={(checked) =>
                  handleSettingChange('assigneeChangeNotification', checked)
                }
                disabled={isLoadingSettings}
              />
            </CardContent>
          </Card>

          {/* Digest Email Settings - Only show when email notification is ON */}
          {localSettings.emailNotification && (
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
                  <p className="text-sm font-medium text-gray-900">
                    ダイジェストメール（まとめ配信）
                  </p>
                  <p className="text-sm text-gray-500">
                    1日の通知を1通のメールにまとめて受け取ります
                  </p>
                </div>
                <ToggleSwitch
                  checked={localSettings.digestEnabled}
                  onChange={(checked) =>
                    handleSettingChange('digestEnabled', checked)
                  }
                  disabled={isLoadingSettings}
                />
              </div>

              {localSettings.digestEnabled && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">配信時刻</p>
                  </div>
                  <Select
                    value={localSettings.digestTime}
                    onChange={(e) =>
                      handleSettingChange('digestTime', e.target.value as DigestTime)
                    }
                    options={Array.from({ length: 24 }, (_, i) => ({
                      value: `${String(i).padStart(2, '0')}:00`,
                      label: `${i}:00`,
                    }))}
                    disabled={isLoadingSettings}
                  />
                </div>
              )}

              <div className="rounded-lg bg-blue-50 p-3">
                <div className="text-xs text-blue-700 space-y-1">
                  <p className="font-medium">
                    {localSettings.digestEnabled ? '✅ ON: ' : '❌ OFF: '}
                    {localSettings.digestEnabled
                      ? '通知をまとめて1日1通のメールで配信します'
                      : '通知ごとに個別メールが届きます（メール数が増えます）'}
                  </p>
                  <p>
                    ダイジェストには本日のタスク、期限超過タスク、未読通知のサマリーが含まれます。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Reminder Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-gray-500" />
                <span>リマインド設定</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    リマインド上限
                  </p>
                  <p className="text-sm text-gray-500">
                    同一タスクに対するリマインドの最大回数を設定します
                  </p>
                </div>
                <Select
                  value={String(localSettings.reminderMaxCount)}
                  onChange={(e) =>
                    handleSettingChange('reminderMaxCount', parseInt(e.target.value, 10))
                  }
                  options={reminderMaxCountOptions}
                  disabled={isLoadingSettings}
                />
              </div>

              {/* リマインド上限のスライダー表示 */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={localSettings.reminderMaxCount}
                  onChange={(e) =>
                    handleSettingChange('reminderMaxCount', parseInt(e.target.value, 10))
                  }
                  disabled={isLoadingSettings}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {/* 目盛りラベル - スライダーの値(1-10)に正確に対応 */}
                {/* 1=0%, 5=44.44% ((5-1)/(10-1)), 10=100% */}
                <div className="relative w-full h-4 text-xs text-gray-500">
                  <span className="absolute left-0 -translate-x-0">1回</span>
                  <span className="absolute -translate-x-1/2" style={{ left: '44.44%' }}>5回</span>
                  <span className="absolute right-0 translate-x-0">10回</span>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs text-amber-700">
                  リマインド上限に達すると、そのタスクに関するリマインド通知は自動的に停止します。
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
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    ダークモード
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    暗い配色のテーマを使用します
                  </p>
                </div>
                <ToggleSwitch
                  checked={theme === 'dark'}
                  onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Status */}
          {updateSettingsMutation.isPending && (
            <div className="flex items-center justify-end gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>保存中...</span>
            </div>
          )}
          {updateSettingsMutation.isSuccess && (
            <div className="flex items-center justify-end gap-2 text-sm text-green-600">
              <Save className="h-4 w-4" />
              <span>設定を保存しました</span>
            </div>
          )}
          {updateSettingsMutation.isError && (
            <div className="flex items-center justify-end gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>保存に失敗しました</span>
            </div>
          )}
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
                  {user?.role === 'admin' ? '管理者' : 'メンバー'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Organization Settings (ADMIN only) */}
          {user?.role === 'admin' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-500" />
                  <span>管理者メニュー</span>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <Link
                  to="/admin/settings"
                  className="flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  <Settings className="h-4 w-4" />
                  組織設定（SMS連携）
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Help */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-500" />
                <span>ヘルプ</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <button
                onClick={() => setIsHelpCenterOpen(true)}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                <HelpCircle className="h-4 w-4" />
                ヘルプセンター
              </button>
              <button
                onClick={() => setIsContactOpen(true)}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                <MessageCircle className="h-4 w-4" />
                お問い合わせ
              </button>
              <button
                onClick={() => setIsTermsOpen(true)}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                <FileText className="h-4 w-4" />
                利用規約
              </button>
              <button
                onClick={() => setIsPrivacyOpen(true)}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                <Lock className="h-4 w-4" />
                プライバシーポリシー
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Help Modals */}
      <HelpCenterModal
        isOpen={isHelpCenterOpen}
        onClose={() => setIsHelpCenterOpen(false)}
      />
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />
      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </div>
  );
}
