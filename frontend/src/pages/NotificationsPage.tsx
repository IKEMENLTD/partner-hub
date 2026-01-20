import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Bell,
  AlertCircle,
  Clock,
  MessageSquare,
  UserPlus,
  GitBranch,
  Filter,
  CheckCheck,
  X,
} from 'lucide-react';
import { useAlerts, useMarkAlertAsRead, useMarkAllAlertsAsRead } from '@/hooks';
import type { Alert, AlertType, AlertSeverity } from '@/types';
import {
  Card,
  CardContent,
  Button,
  Select,
  PageLoading,
  ErrorMessage,
  EmptyState,
  Badge,
} from '@/components/common';
import clsx from 'clsx';

const alertTypeConfig: Record<AlertType, { icon: typeof Clock; color: string; label: string }> = {
  deadline_approaching: { icon: Clock, color: 'text-orange-500', label: '期限接近' },
  task_overdue: { icon: AlertCircle, color: 'text-red-500', label: '期限超過' },
  mention: { icon: MessageSquare, color: 'text-blue-500', label: 'メンション' },
  assignment: { icon: UserPlus, color: 'text-green-500', label: 'アサイン' },
  status_change: { icon: GitBranch, color: 'text-purple-500', label: 'ステータス変更' },
  comment: { icon: MessageSquare, color: 'text-gray-500', label: 'コメント' },
};

const severityStyles: Record<AlertSeverity, string> = {
  info: 'border-l-blue-400',
  warning: 'border-l-yellow-400',
  error: 'border-l-red-400',
  success: 'border-l-green-400',
};

export function NotificationsPage() {
  const { data, isLoading, error, refetch } = useAlerts();
  const { mutate: markAsRead } = useMarkAlertAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllAlertsAsRead();

  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');

  const alerts = (data || []) as Alert[];

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (filterType !== 'all' && alert.type !== filterType) {
        return false;
      }
      if (filterRead === 'unread' && alert.isRead) {
        return false;
      }
      if (filterRead === 'read' && !alert.isRead) {
        return false;
      }
      return true;
    });
  }, [alerts, filterType, filterRead]);

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="通知の読み込みに失敗しました"
        retry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">通知</h1>
            {unreadCount > 0 && (
              <Badge variant="primary">{unreadCount} 件の未読</Badge>
            )}
          </div>
          <p className="mt-1 text-gray-600">
            プロジェクトやタスクに関する通知を確認できます
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            leftIcon={<CheckCheck className="h-4 w-4" />}
            onClick={() => markAllAsRead()}
            isLoading={isMarkingAll}
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
              label="通知タイプ"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full sm:w-48"
              options={[
                { value: 'all', label: 'すべてのタイプ' },
                { value: 'deadline_approaching', label: '期限接近' },
                { value: 'task_overdue', label: '期限超過' },
                { value: 'mention', label: 'メンション' },
                { value: 'assignment', label: 'アサイン' },
                { value: 'status_change', label: 'ステータス変更' },
                { value: 'comment', label: 'コメント' },
              ]}
            />
            <Select
              label="既読状態"
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
              className="w-full sm:w-48"
              options={[
                { value: 'all', label: 'すべて' },
                { value: 'unread', label: '未読のみ' },
                { value: 'read', label: '既読のみ' },
              ]}
            />
          </div>
          <div className="text-sm text-gray-500">
            {filteredAlerts.length} 件表示
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {filteredAlerts.length === 0 ? (
        <Card className="py-12">
          <EmptyState
            icon={<Bell className="h-12 w-12" />}
            title="通知はありません"
            description={
              filterType !== 'all' || filterRead !== 'all'
                ? 'フィルターを変更すると、他の通知が表示される場合があります'
                : 'プロジェクトやタスクの更新があると、ここに通知が表示されます'
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const config = alertTypeConfig[alert.type];
            const Icon = config.icon;

            return (
              <Card
                key={alert.id}
                className={clsx(
                  'relative border-l-4 transition-colors',
                  severityStyles[alert.severity],
                  !alert.isRead && 'bg-blue-50/50'
                )}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className={clsx('flex-shrink-0 mt-0.5', config.color)}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-gray-900">
                              {alert.title}
                            </h3>
                            <Badge variant="default" className="text-xs">
                              {config.label}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {alert.message}
                          </p>
                        </div>

                        {!alert.isRead && (
                          <button
                            onClick={() => markAsRead(alert.id)}
                            className="flex-shrink-0 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                            aria-label="既読にする"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <span className="text-xs text-gray-500">
                          {format(new Date(alert.createdAt), 'yyyy年M月d日 HH:mm', {
                            locale: ja,
                          })}
                        </span>

                        {alert.projectId && (
                          <Link
                            to={`/projects/${alert.projectId}`}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700"
                          >
                            案件を確認
                          </Link>
                        )}

                        {alert.taskId && (
                          <Link
                            to={`/projects/${alert.projectId}/tasks/${alert.taskId}`}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700"
                          >
                            タスクを確認
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {!alert.isRead && (
                    <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-primary-500" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {Object.entries(alertTypeConfig).map(([type, config]) => {
          const count = alerts.filter((a) => a.type === type).length;
          const Icon = config.icon;
          return (
            <Card
              key={type}
              className={clsx(
                'cursor-pointer transition-colors hover:bg-gray-50',
                filterType === type && 'ring-2 ring-primary-500'
              )}
              onClick={() =>
                setFilterType(filterType === type ? 'all' : type)
              }
            >
              <CardContent className="flex items-center gap-3 py-3">
                <div className={config.color}>
                  <Icon className="h-5 w-5" />
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
