import { Link } from 'react-router-dom';
import { Calendar, Clock, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Task } from '@/types';
import { getUserDisplayName } from '@/types';
import { Badge, Avatar, Card } from '@/components/common';
import clsx from 'clsx';

interface TaskCardProps {
  task: Task;
  onStatusChange?: (taskId: string, status: Task['status']) => void;
  compact?: boolean;
}

const statusConfig = {
  todo: { label: '未着手', variant: 'default' as const, icon: Circle },
  in_progress: { label: '進行中', variant: 'primary' as const, icon: Clock },
  in_review: { label: 'レビュー', variant: 'warning' as const, icon: AlertCircle },
  completed: { label: '完了', variant: 'success' as const, icon: CheckCircle2 },
  blocked: { label: 'ブロック', variant: 'danger' as const, icon: AlertCircle },
  cancelled: { label: 'キャンセル', variant: 'default' as const, icon: Circle },
};

const priorityConfig = {
  low: { label: '低', variant: 'default' as const },
  medium: { label: '中', variant: 'info' as const },
  high: { label: '高', variant: 'warning' as const },
  urgent: { label: '緊急', variant: 'danger' as const },
};

export function TaskCard({ task, onStatusChange, compact = false }: TaskCardProps) {
  const status = statusConfig[task.status];
  const priority = priorityConfig[task.priority];
  const StatusIcon = status.icon;

  const isDueOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed';
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));

  const handleStatusToggle = () => {
    if (!onStatusChange) return;
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    onStatusChange(task.id, nextStatus);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 transition-colors">
        <button
          onClick={handleStatusToggle}
          className={clsx(
            'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            task.status === 'completed'
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-gray-300 hover:border-primary-500'
          )}
          aria-label={task.status === 'completed' ? 'タスクを未完了にする' : 'タスクを完了にする'}
        >
          {task.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
        </button>
        <div className="flex-1 min-w-0">
          {task.projectId ? (
            <Link
              to={`/projects/${task.projectId}/tasks/${task.id}`}
              className={clsx(
                'text-sm font-medium hover:text-primary-600 truncate block',
                task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'
              )}
            >
              {task.title}
            </Link>
          ) : (
            <span className={clsx(
              'text-sm font-medium truncate block',
              task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'
            )}>
              {task.title}
            </span>
          )}
        </div>
        {task.dueDate && (
          <span
            className={clsx(
              'text-xs flex-shrink-0',
              isDueOverdue ? 'text-red-600 font-medium' : isDueToday ? 'text-orange-600' : 'text-gray-500'
            )}
          >
            {format(new Date(task.dueDate), 'M/d', { locale: ja })}
          </span>
        )}
        <Badge variant={priority.variant} size="sm">
          {priority.label}
        </Badge>
      </div>
    );
  }

  return (
    <Card hoverable className="transition-shadow">
      <div className="flex items-start gap-4">
        <button
          onClick={handleStatusToggle}
          className={clsx(
            'mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            task.status === 'completed'
              ? 'border-green-500 bg-green-500 text-white'
              : 'border-gray-300 hover:border-primary-500'
          )}
          aria-label={task.status === 'completed' ? 'タスクを未完了にする' : 'タスクを完了にする'}
        >
          {task.status === 'completed' && <CheckCircle2 className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              {task.projectId ? (
                <Link
                  to={`/projects/${task.projectId}/tasks/${task.id}`}
                  className={clsx(
                    'text-base font-medium hover:text-primary-600',
                    task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'
                  )}
                >
                  {task.title}
                </Link>
              ) : (
                <span className={clsx(
                  'text-base font-medium',
                  task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'
                )}>
                  {task.title}
                </span>
              )}
              {task.description && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge variant={status.variant} size="sm">
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
            <Badge variant={priority.variant} size="sm">
              {priority.label}
            </Badge>

            {task.dueDate && (
              <span
                className={clsx(
                  'flex items-center gap-1 text-xs',
                  isDueOverdue
                    ? 'text-red-600 font-medium'
                    : isDueToday
                    ? 'text-orange-600'
                    : 'text-gray-500'
                )}
              >
                <Calendar className="h-3 w-3" />
                {format(new Date(task.dueDate), 'M月d日', { locale: ja })}
                {isDueOverdue && ' (期限超過)'}
                {isDueToday && ' (今日)'}
              </span>
            )}

            {task.estimatedHours && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {task.estimatedHours}h
              </span>
            )}
          </div>

          {((Array.isArray(task.tags) && task.tags.length > 0) || task.assignee) && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(task.tags) ? task.tags : []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-700 dark:text-gray-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {task.assignee && (
                <Avatar name={getUserDisplayName(task.assignee)} src={task.assignee.avatarUrl} size="xs" />
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
