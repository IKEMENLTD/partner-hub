import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Bell,
  Clock,
  AlertTriangle,
  Calendar,
  Activity,
  Filter,
  CheckCheck,
  Check,
  XCircle,
} from 'lucide-react';
import {
  useMyReminders,
  useReminderUnreadCount,
  useMarkReminderAsRead,
  useMarkAllRemindersAsRead,
} from '@/hooks/useReminders';
import type { ReminderType, ReminderStatus } from '@/services/reminderService';
import {
  Card,
  CardContent,
  Button,
  Select,
  PageLoading,
  EmptyState,
  Badge,
} from '@/components/common';
import clsx from 'clsx';

const typeConfig: Record<ReminderType, { icon: typeof Clock; color: string; label: string }> = {
  task_due: { icon: Clock, color: 'text-orange-500', label: 'タスク期限' },
  task_overdue: { icon: AlertTriangle, color: 'text-red-500', label: 'タスク超過' },
  project_deadline: { icon: Calendar, color: 'text-blue-500', label: '案件期限' },
  project_overdue: { icon: AlertTriangle, color: 'text-red-600', label: '案件超過' },
  project_stagnant: { icon: Activity, color: 'text-yellow-500', label: '停滞案件' },
  status_update_request: { icon: Bell, color: 'text-purple-500', label: 'ステータス更新' },
  partner_activity: { icon: Bell, color: 'text-green-500', label: 'パートナー' },
  custom: { icon: Bell, color: 'text-gray-500', label: 'カスタム' },
};

const statusConfig: Record<ReminderStatus, { label: string; variant: 'default' | 'success' | 'danger' | 'warning' }> = {
  pending: { label: '予定', variant: 'warning' },
  sent: { label: '送信済み', variant: 'success' },
  failed: { label: '失敗', variant: 'danger' },
  cancelled: { label: 'キャンセル', variant: 'default' },
};

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'すべてのタイプ' },
  { value: 'task_due', label: 'タスク期限' },
  { value: 'task_overdue', label: 'タスク超過' },
  { value: 'project_deadline', label: '案件期限' },
  { value: 'project_overdue', label: '案件超過' },
  { value: 'project_stagnant', label: '停滞案件' },
  { value: 'status_update_request', label: 'ステータス更新' },
  { value: 'custom', label: 'カスタム' },
];

const READ_FILTER_OPTIONS = [
  { value: 'all', label: 'すべて' },
  { value: 'unread', label: '未読のみ' },
  { value: 'read', label: '既読のみ' },
];

export function RemindersPage() {
  const { data: reminders = [], isLoading } = useMyReminders();
  const { data: unreadCount = 0 } = useReminderUnreadCount();
  const { mutate: markAsRead } = useMarkReminderAsRead();
  const { mutate: markAllAsRead } = useMarkAllRemindersAsRead();

  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');

  const filtered = useMemo(() => {
    return reminders.filter((r) => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterRead === 'unread' && r.isRead) return false;
      if (filterRead === 'read' && !r.isRead) return false;
      return true;
    });
  }, [reminders, filterType, filterRead]);

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">リマインダー</h1>
            {unreadCount > 0 && (
              <Badge variant="primary">{unreadCount} 件の未読</Badge>
            )}
          </div>
          <p className="mt-1 text-gray-600">
            タスクや案件の期限に関するリマインダーを確認できます
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            leftIcon={<CheckCheck className="h-4 w-4" />}
            onClick={() => markAllAsRead()}
          >
            すべて既読にする
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-2 text-gray-500">
            <Filter className="h-5 w-5" />
            <span className="text-sm font-medium">フィルター</span>
          </div>
          <div className="flex flex-1 flex-wrap gap-4">
            <Select
              label="タイプ"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full sm:w-48"
              options={TYPE_FILTER_OPTIONS}
            />
            <Select
              label="既読状態"
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
              className="w-full sm:w-48"
              options={READ_FILTER_OPTIONS}
            />
          </div>
          <div className="text-sm text-gray-500">
            {filtered.length} 件表示
          </div>
        </CardContent>
      </Card>

      {/* Reminders List */}
      {filtered.length === 0 ? (
        <Card className="py-12">
          <EmptyState
            icon={<Bell className="h-12 w-12" />}
            title="リマインダーはありません"
            description={
              filterType !== 'all' || filterRead !== 'all'
                ? 'フィルターを変更すると、他のリマインダーが表示される場合があります'
                : 'タスクや案件の期限が近づくと、ここにリマインダーが表示されます'
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((reminder) => {
            const tConfig = typeConfig[reminder.type] || typeConfig.custom;
            const sConfig = statusConfig[reminder.status] || statusConfig.pending;
            const Icon = tConfig.icon;

            return (
              <Card
                key={reminder.id}
                className={clsx(
                  'relative transition-colors',
                  !reminder.isRead && 'bg-blue-50/50'
                )}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className={clsx('flex-shrink-0 mt-0.5', tConfig.color)}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-medium text-gray-900">
                              {reminder.title}
                            </h3>
                            <Badge variant="default" className="text-xs">
                              {tConfig.label}
                            </Badge>
                            <Badge variant={sConfig.variant} className="text-xs">
                              {sConfig.label}
                            </Badge>
                            {!reminder.isRead && (
                              <span className="h-2 w-2 rounded-full bg-primary-500" />
                            )}
                          </div>
                          {reminder.message && (
                            <p className="mt-1 text-sm text-gray-600">
                              {reminder.message}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!reminder.isRead && (
                            <button
                              onClick={() => markAsRead(reminder.id)}
                              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                              aria-label="既読にする"
                              title="既読にする"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          {reminder.status === 'failed' && (
                            <span title={reminder.errorMessage}><XCircle className="h-4 w-4 text-red-400" /></span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <span className="text-xs text-gray-500">
                          {format(new Date(reminder.scheduledAt), 'yyyy年M月d日 HH:mm', { locale: ja })}
                        </span>

                        {reminder.projectId && (
                          <Link
                            to={`/projects/${reminder.projectId}`}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700"
                          >
                            案件を確認
                          </Link>
                        )}

                        {reminder.taskId && reminder.projectId && (
                          <Link
                            to={`/projects/${reminder.projectId}/tasks/${reminder.taskId}`}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700"
                          >
                            タスクを確認
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Type Stats */}
      <div className="grid-stats">
        {Object.entries(typeConfig)
          .filter(([type]) => reminders.some((r) => r.type === type))
          .map(([type, config]) => {
            const count = reminders.filter((r) => r.type === type).length;
            const TypeIcon = config.icon;
            return (
              <Card
                key={type}
                className={clsx(
                  'cursor-pointer transition-colors hover:bg-gray-50',
                  filterType === type && 'ring-2 ring-primary-500'
                )}
                onClick={() => setFilterType(filterType === type ? 'all' : type)}
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <div className={config.color}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{config.label}</p>
                    <p className="text-lg font-semibold text-gray-900">{count}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
