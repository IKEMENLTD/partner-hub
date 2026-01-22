import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Plus,
} from 'lucide-react';
import type { Task, TaskStatus, Priority } from '@/types';
import { getUserDisplayName } from '@/types';
import { Badge, Avatar, Button, Select, EmptyState } from '@/components/common';
import clsx from 'clsx';

interface TaskListProps {
  tasks: Task[];
  onTaskStatusChange?: (taskId: string, status: TaskStatus) => void;
  onTaskClick?: (task: Task) => void;
  onAddTask?: () => void;
  showFilters?: boolean;
}

const statusConfig: Record<TaskStatus, { label: string; icon: typeof Circle; color: string }> = {
  todo: { label: '未着手', icon: Circle, color: 'text-gray-400' },
  in_progress: { label: '進行中', icon: Clock, color: 'text-blue-500' },
  in_review: { label: 'レビュー', icon: AlertCircle, color: 'text-yellow-500' },
  completed: { label: '完了', icon: CheckCircle2, color: 'text-green-500' },
  blocked: { label: 'ブロック', icon: AlertCircle, color: 'text-red-500' },
  cancelled: { label: 'キャンセル', icon: Circle, color: 'text-gray-400' },
};

const priorityConfig: Record<Priority, { label: string; variant: 'default' | 'info' | 'warning' | 'danger' }> = {
  low: { label: '低', variant: 'default' },
  medium: { label: '中', variant: 'info' },
  high: { label: '高', variant: 'warning' },
  urgent: { label: '緊急', variant: 'danger' },
};

export function TaskList({
  tasks,
  onTaskStatusChange,
  onTaskClick,
  onAddTask,
  showFilters = true,
}: TaskListProps) {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const filteredTasks = safeTasks.filter((task) => {
    if (statusFilter && task.status !== statusFilter) return false;
    if (priorityFilter && task.priority !== priorityFilter) return false;
    return true;
  });

  const handleStatusToggle = (task: Task) => {
    if (!onTaskStatusChange) return;
    const nextStatus: TaskStatus = task.status === 'completed' ? 'todo' : 'completed';
    onTaskStatusChange(task.id, nextStatus);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {filteredTasks.length} 件のタスク
          </span>
          {showFilters && (
            <div className="flex items-center gap-2">
              <Select
                options={[
                  { value: '', label: 'すべて' },
                  { value: 'todo', label: '未着手' },
                  { value: 'in_progress', label: '進行中' },
                  { value: 'in_review', label: 'レビュー' },
                  { value: 'completed', label: '完了' },
                  { value: 'blocked', label: 'ブロック' },
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
                className="w-28"
              />
              <Select
                options={[
                  { value: '', label: 'すべて' },
                  { value: 'low', label: '低' },
                  { value: 'medium', label: '中' },
                  { value: 'high', label: '高' },
                  { value: 'urgent', label: '緊急' },
                ]}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as Priority | '')}
                className="w-24"
              />
            </div>
          )}
        </div>
        {onAddTask && (
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={onAddTask}>
            タスク追加
          </Button>
        )}
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          title="タスクがありません"
          description="新しいタスクを追加してください"
          action={
            onAddTask && (
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={onAddTask}
              >
                タスク追加
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
          {filteredTasks.map((task) => {
            const status = statusConfig[task.status];
            const priority = priorityConfig[task.priority];
            const StatusIcon = status.icon;

            return (
              <li
                key={task.id}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                {/* Status toggle */}
                <button
                  onClick={() => handleStatusToggle(task)}
                  className={clsx(
                    'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    task.status === 'completed'
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 hover:border-primary-500'
                  )}
                  aria-label={task.status === 'completed' ? 'タスクを未完了にする' : 'タスクを完了にする'}
                >
                  {task.status === 'completed' && <CheckCircle2 className="h-4 w-4" />}
                </button>

                {/* Task info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="flex items-center gap-2">
                    <h4
                      className={clsx(
                        'text-sm font-medium truncate',
                        task.status === 'completed'
                          ? 'text-gray-400 line-through'
                          : 'text-gray-900 dark:text-gray-100'
                      )}
                    >
                      {task.title}
                    </h4>
                    <Badge variant={priority.variant} size="sm">
                      {priority.label}
                    </Badge>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <span className={clsx('flex items-center gap-1', status.color)}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                    {task.dueDate && (
                      <span>
                        期限: {format(new Date(task.dueDate), 'M/d', { locale: ja })}
                      </span>
                    )}
                    {task.estimatedHours && (
                      <span>見積: {task.estimatedHours}h</span>
                    )}
                  </div>
                </div>

                {/* Assignee */}
                {task.assignee && (
                  <Avatar
                    name={getUserDisplayName(task.assignee)}
                    src={task.assignee.avatarUrl}
                    size="sm"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
