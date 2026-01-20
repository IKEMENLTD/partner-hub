import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  AlertCircle,
  Clock,
  MessageSquare,
  UserPlus,
  GitBranch,
  Bell,
  X,
} from 'lucide-react';
import type { Alert } from '@/types';
import { Card } from '@/components/common';
import clsx from 'clsx';

interface AlertListProps {
  alerts: Alert[];
  onMarkAsRead?: (alertId: string) => void;
  onMarkAllAsRead?: () => void;
  showMarkAll?: boolean;
}

const alertTypeConfig = {
  deadline_approaching: { icon: Clock, color: 'text-orange-500' },
  task_overdue: { icon: AlertCircle, color: 'text-red-500' },
  mention: { icon: MessageSquare, color: 'text-blue-500' },
  assignment: { icon: UserPlus, color: 'text-green-500' },
  status_change: { icon: GitBranch, color: 'text-purple-500' },
  comment: { icon: MessageSquare, color: 'text-gray-500' },
};

const severityStyles = {
  info: 'border-l-blue-400',
  warning: 'border-l-yellow-400',
  error: 'border-l-red-400',
  success: 'border-l-green-400',
};

export function AlertList({
  alerts,
  onMarkAsRead,
  onMarkAllAsRead,
  showMarkAll = true,
}: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <Card className="text-center py-8">
        <Bell className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">アラートはありません</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {showMarkAll && alerts.some((a) => !a.isRead) && (
        <div className="flex justify-end">
          <button
            onClick={onMarkAllAsRead}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            すべて既読にする
          </button>
        </div>
      )}

      {alerts.map((alert) => {
        const config = alertTypeConfig[alert.type];
        const Icon = config.icon;

        return (
          <div
            key={alert.id}
            className={clsx(
              'relative rounded-lg border border-l-4 bg-white p-4 transition-colors',
              severityStyles[alert.severity],
              !alert.isRead && 'bg-blue-50/50'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={clsx('flex-shrink-0', config.color)}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {alert.title}
                    </h4>
                    <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                  </div>

                  {!alert.isRead && onMarkAsRead && (
                    <button
                      onClick={() => onMarkAsRead(alert.id)}
                      className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                      aria-label="既読にする"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-4">
                  <span className="text-xs text-gray-500">
                    {format(new Date(alert.createdAt), 'M月d日 HH:mm', { locale: ja })}
                  </span>

                  {alert.projectId && (
                    <Link
                      to={`/projects/${alert.projectId}`}
                      className="text-xs text-primary-600 hover:text-primary-700"
                    >
                      案件を確認
                    </Link>
                  )}

                  {alert.taskId && (
                    <Link
                      to={`/projects/${alert.projectId}/tasks/${alert.taskId}`}
                      className="text-xs text-primary-600 hover:text-primary-700"
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
          </div>
        );
      })}
    </div>
  );
}
