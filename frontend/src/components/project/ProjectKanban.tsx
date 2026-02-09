import { useMemo } from 'react';
import type { Project, ProjectStatus } from '@/types';
import { ProjectCard } from './ProjectCard';
import clsx from 'clsx';

interface ProjectKanbanProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
}

const columns: { status: ProjectStatus; label: string; color: string }[] = [
  { status: 'planning', label: '計画中', color: 'bg-blue-500' },
  { status: 'in_progress', label: '進行中', color: 'bg-primary-500' },
  { status: 'review', label: 'レビュー', color: 'bg-yellow-500' },
  { status: 'completed', label: '完了', color: 'bg-green-500' },
];

export function ProjectKanban({ projects, onProjectClick }: ProjectKanbanProps) {
  const groupedProjects = useMemo(() => {
    const groups: Record<ProjectStatus, Project[]> = {
      draft: [],
      planning: [],
      in_progress: [],
      review: [],
      completed: [],
      on_hold: [],
      cancelled: [],
    };

    projects.forEach((project) => {
      if (groups[project.status]) {
        groups[project.status].push(project);
      }
    });

    return groups;
  }, [projects]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div
          key={column.status}
          className="flex-shrink-0 w-64 sm:w-72 lg:w-80"
          role="region"
          aria-label={`${column.label}列`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className={clsx('h-2 w-2 rounded-full', column.color)} />
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{column.label}</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({groupedProjects[column.status].length})
            </span>
          </div>

          <div className="space-y-3 min-h-[200px] rounded-lg bg-gray-50 p-3 dark:bg-slate-800">
            {groupedProjects[column.status].length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8 dark:text-gray-500">
                案件がありません
              </p>
            ) : (
              groupedProjects[column.status].map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => onProjectClick?.(project)}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
