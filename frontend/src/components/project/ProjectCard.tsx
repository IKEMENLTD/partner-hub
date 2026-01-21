import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar, Users, FolderKanban, MoreHorizontal } from 'lucide-react';
import type { Project } from '@/types';
import { Badge, AvatarGroup, Card, HealthScoreBadge } from '@/components/common';
import clsx from 'clsx';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

const statusConfig = {
  draft: { label: '下書き', variant: 'default' as const },
  planning: { label: '計画中', variant: 'info' as const },
  in_progress: { label: '進行中', variant: 'primary' as const },
  review: { label: 'レビュー', variant: 'warning' as const },
  completed: { label: '完了', variant: 'success' as const },
  on_hold: { label: '保留', variant: 'default' as const },
  cancelled: { label: 'キャンセル', variant: 'danger' as const },
};

const priorityConfig = {
  low: { label: '低', variant: 'default' as const },
  medium: { label: '中', variant: 'info' as const },
  high: { label: '高', variant: 'warning' as const },
  urgent: { label: '緊急', variant: 'danger' as const },
};

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const status = statusConfig[project.status] ?? { label: project.status, variant: 'default' as const };
  const priority = priorityConfig[project.priority] ?? { label: project.priority, variant: 'default' as const };

  const progress = project.progress ?? 0;

  return (
    <Card
      hoverable
      className="cursor-pointer"
      onClick={onClick}
      role="article"
      aria-label={`案件: ${project.name}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900">
            <FolderKanban className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <Link
              to={`/projects/${project.id}`}
              className="text-base font-semibold text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400"
              onClick={(e) => e.stopPropagation()}
            >
              {project.name}
            </Link>
          </div>
        </div>
        <button
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-500 dark:hover:bg-slate-700 dark:hover:text-gray-400"
          onClick={(e) => {
            e.stopPropagation();
            // Menu handling would go here
          }}
          aria-label="オプション"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {project.description && (
        <p className="mt-3 text-sm text-gray-600 line-clamp-2 dark:text-gray-400">
          {project.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant={status.variant}>{status.label}</Badge>
        <Badge variant={priority.variant}>{priority.label}</Badge>
        {project.healthScore !== undefined && (
          <HealthScoreBadge score={project.healthScore} showLabel={false} />
        )}
        {project.tags?.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="default">
            {tag}
          </Badge>
        ))}
        {project.tags && project.tags.length > 2 && (
          <Badge variant="default">+{project.tags.length - 2}</Badge>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">進捗</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-slate-700">
          <div
            className={clsx(
              'h-2 rounded-full transition-all',
              progress === 100 ? 'bg-green-500' : 'bg-primary-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-slate-700">
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(project.startDate), 'M/d', { locale: ja })}
            {project.endDate && (
              <> - {format(new Date(project.endDate), 'M/d', { locale: ja })}</>
            )}
          </span>
          {project.partners && project.partners.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {project.partners.length}
            </span>
          )}
        </div>

        {project.partners && project.partners.length > 0 && (
          <AvatarGroup
            avatars={project.partners.map((p) => ({
              name: p.companyName || p.name,
            }))}
            max={3}
            size="xs"
          />
        )}
      </div>
    </Card>
  );
}
