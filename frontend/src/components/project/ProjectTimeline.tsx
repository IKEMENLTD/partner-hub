import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  FolderKanban,
  CheckCircle2,
  UserPlus,
  UserMinus,
  MessageSquare,
  GitBranch,
  Edit,
} from 'lucide-react';
import type { TimelineEvent, TimelineEventType } from '@/types';
import { getUserDisplayName } from '@/types';
import { Avatar, EmptyState } from '@/components/common';
import clsx from 'clsx';

interface ProjectTimelineProps {
  events: TimelineEvent[];
}

const eventTypeConfig: Record<
  TimelineEventType,
  { icon: typeof FolderKanban; color: string; bgColor: string }
> = {
  project_created: {
    icon: FolderKanban,
    color: 'text-primary-600',
    bgColor: 'bg-primary-100',
  },
  project_updated: {
    icon: Edit,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  task_created: {
    icon: FolderKanban,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  task_completed: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  member_added: {
    icon: UserPlus,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  member_removed: {
    icon: UserMinus,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  comment_added: {
    icon: MessageSquare,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  status_changed: {
    icon: GitBranch,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
};

export function ProjectTimeline({ events }: ProjectTimelineProps) {
  // 配列チェック - events が配列でない場合は空配列として扱う
  const safeEvents = Array.isArray(events) ? events : [];

  if (safeEvents.length === 0) {
    return (
      <EmptyState
        title="アクティビティがありません"
        description="プロジェクトのアクティビティがここに表示されます"
      />
    );
  }

  // Group events by date
  const groupedEvents: Record<string, TimelineEvent[]> = {};
  safeEvents.forEach((event) => {
    const dateKey = format(new Date(event.createdAt), 'yyyy-MM-dd');
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = [];
    }
    groupedEvents[dateKey].push(event);
  });

  return (
    <div className="space-y-8">
      {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
        <div key={dateKey}>
          <h3 className="mb-4 text-sm font-medium text-gray-500">
            {format(new Date(dateKey), 'M月d日 (E)', { locale: ja })}
          </h3>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700" />

            <ul className="space-y-4">
              {dayEvents.map((event) => {
                const config = eventTypeConfig[event.type];
                const Icon = config.icon;

                return (
                  <li key={event.id} className="relative flex gap-4 pl-10">
                    {/* Icon */}
                    <div
                      className={clsx(
                        'absolute left-0 flex h-8 w-8 items-center justify-center rounded-full',
                        config.bgColor
                      )}
                    >
                      <Icon className={clsx('h-4 w-4', config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {event.title}
                          </h4>
                          {event.description && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <span className="flex-shrink-0 text-xs text-gray-500">
                          {format(new Date(event.createdAt), 'HH:mm')}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <Avatar
                          name={getUserDisplayName(event.user)}
                          src={event.user.avatarUrl}
                          size="xs"
                        />
                        <span className="text-xs text-gray-500">
                          {getUserDisplayName(event.user)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
