import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Bell,
  Clock,
  MessageSquare,
  UserPlus,
  Settings,
  Filter,
  CheckCheck,
  Check,
} from 'lucide-react';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import type { InAppNotificationType } from '@/types';
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

const notificationTypeConfig: Record<InAppNotificationType, { icon: typeof Clock; color: string; label: string }> = {
  deadline: { icon: Clock, color: 'text-orange-500', label: '期限通知' },
  mention: { icon: MessageSquare, color: 'text-blue-500', label: 'メンション' },
  assigned: { icon: UserPlus, color: 'text-green-500', label: '担当者アサイン' },
  system: { icon: Settings, color: 'text-gray-500', label: 'システム' },
};

export function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useInAppNotifications();

  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filterType !== 'all' && notification.type !== filterType) {
        return false;
      }
      if (filterRead === 'unread' && notification.isRead) {
        return false;
      }
      if (filterRead === 'read' && !notification.isRead) {
        return false;
      }
      return true;
    });
  }, [notifications, filterType, filterRead]);

  if (isLoading) {
    return <PageLoading />;
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
                { value: 'deadline', label: '期限通知' },
                { value: 'mention', label: 'メンション' },
                { value: 'assigned', label: '担当者アサイン' },
                { value: 'system', label: 'システム' },
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
            {filteredNotifications.length} 件表示
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
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
          {filteredNotifications.map((notification) => {
            const config = notificationTypeConfig[notification.type] || notificationTypeConfig.system;
            const Icon = config.icon;

            return (
              <Card
                key={notification.id}
                className={clsx(
                  'relative transition-colors',
                  !notification.isRead && 'bg-blue-50/50'
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
                              {notification.title}
                            </h3>
                            <Badge variant="default" className="text-xs">
                              {config.label}
                            </Badge>
                            {!notification.isRead && (
                              <span className="h-2 w-2 rounded-full bg-primary-500" />
                            )}
                          </div>
                          {notification.message && (
                            <p className="mt-1 text-sm text-gray-600">
                              {notification.message}
                            </p>
                          )}
                        </div>

                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="flex-shrink-0 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                            aria-label="既読にする"
                            title="既読にする"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <span className="text-xs text-gray-500">
                          {format(new Date(notification.createdAt), 'yyyy年M月d日 HH:mm', {
                            locale: ja,
                          })}
                        </span>

                        {notification.linkUrl && (
                          <Link
                            to={notification.linkUrl}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700"
                          >
                            詳細を確認
                          </Link>
                        )}

                        {notification.projectId && !notification.linkUrl && (
                          <Link
                            to={`/projects/${notification.projectId}`}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700"
                          >
                            案件を確認
                          </Link>
                        )}

                        {notification.taskId && !notification.linkUrl && (
                          <Link
                            to={`/projects/${notification.projectId}/tasks/${notification.taskId}`}
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

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.entries(notificationTypeConfig).map(([type, config]) => {
          const count = notifications.filter((n) => n.type === type).length;
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
