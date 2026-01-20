import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Project, SortOrder } from '@/types';
import { getUserDisplayName } from '@/types';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Avatar,
} from '@/components/common';

interface ProjectListProps {
  projects: Project[];
  sortField?: string;
  sortOrder?: SortOrder;
  onSort?: (field: string) => void;
  onProjectClick?: (project: Project) => void;
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

export function ProjectList({
  projects,
  sortField,
  sortOrder,
  onSort,
  onProjectClick,
}: ProjectListProps) {
  const getSortOrder = (field: string): SortOrder | null => {
    return sortField === field ? sortOrder || null : null;
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              sortable
              sortOrder={getSortOrder('title')}
              onSort={() => onSort?.('title')}
            >
              案件名
            </TableHead>
            <TableHead
              sortable
              sortOrder={getSortOrder('status')}
              onSort={() => onSort?.('status')}
            >
              ステータス
            </TableHead>
            <TableHead
              sortable
              sortOrder={getSortOrder('priority')}
              onSort={() => onSort?.('priority')}
            >
              優先度
            </TableHead>
            <TableHead
              sortable
              sortOrder={getSortOrder('startDate')}
              onSort={() => onSort?.('startDate')}
            >
              期間
            </TableHead>
            <TableHead>担当者</TableHead>
            <TableHead>パートナー</TableHead>
            <TableHead align="right">進捗</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const status = statusConfig[project.status] ?? { label: project.status, variant: 'default' as const };
            const priority = priorityConfig[project.priority] ?? { label: project.priority, variant: 'default' as const };
            const progress = project.progress ?? 0;

            return (
              <TableRow
                key={project.id}
                onClick={() => onProjectClick?.(project)}
                className="cursor-pointer"
              >
                <TableCell>
                  <div>
                    <Link
                      to={`/projects/${project.id}`}
                      className="font-medium text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {project.name}
                    </Link>
                    {project.description && (
                      <p className="text-xs text-gray-500 truncate max-w-xs dark:text-gray-400">{project.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={priority.variant}>{priority.label}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-gray-700 dark:text-gray-300">
                    {format(new Date(project.startDate), 'M/d', { locale: ja })}
                  </span>
                  {project.endDate && (
                    <span className="text-gray-500 dark:text-gray-400">
                      {' '}
                      - {format(new Date(project.endDate), 'M/d', { locale: ja })}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {project.manager && (
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={getUserDisplayName(project.manager)}
                        src={project.manager.avatarUrl}
                        size="xs"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {getUserDisplayName(project.manager)}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {project.partners && project.partners.length > 0 && (
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {project.partners.map(p => p.companyName || p.name).join(', ')}
                    </span>
                  )}
                </TableCell>
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-20 h-2 rounded-full bg-gray-200 dark:bg-slate-700">
                      <div
                        className="h-2 rounded-full bg-primary-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-10 text-right dark:text-gray-400">
                      {progress}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
