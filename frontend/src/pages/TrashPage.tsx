import { useState } from 'react';
import clsx from 'clsx';
import { RotateCcw } from 'lucide-react';
import {
  useDeletedProjects,
  useDeletedTasks,
  useDeletedPartners,
  useRestoreProject,
  useRestoreTask,
  useRestorePartner,
} from '@/hooks';
import { useToast } from '@/components/common/ToastContext';
import type { Project, Task, Partner } from '@/types';

// API returns deletedAt and relations for deleted items
interface DeletedProject extends Project { deletedAt: string; }
interface DeletedTask extends Task { deletedAt: string; project?: { id: string; name: string }; }
interface DeletedPartner extends Partner { deletedAt: string; }

type TabType = 'projects' | 'tasks' | 'partners';

const tabs: { key: TabType; label: string }[] = [
  { key: 'projects', label: '案件' },
  { key: 'tasks', label: 'タスク' },
  { key: 'partners', label: 'パートナー' },
];

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ja-JP');
}

export function TrashPage() {
  const [activeTab, setActiveTab] = useState<TabType>('projects');
  const { addToast } = useToast();

  const { data: rawProjects, isLoading: loadingProjects } = useDeletedProjects();
  const { data: rawTasks, isLoading: loadingTasks } = useDeletedTasks();
  const { data: rawPartners, isLoading: loadingPartners } = useDeletedPartners();

  const deletedProjects = rawProjects as DeletedProject[] | undefined;
  const deletedTasks = rawTasks as DeletedTask[] | undefined;
  const deletedPartners = rawPartners as DeletedPartner[] | undefined;

  const restoreProject = useRestoreProject();
  const restoreTask = useRestoreTask();
  const restorePartner = useRestorePartner();

  const handleRestore = async (type: TabType, id: string, name: string) => {
    try {
      if (type === 'projects') {
        await restoreProject.mutateAsync(id);
      } else if (type === 'tasks') {
        await restoreTask.mutateAsync(id);
      } else {
        await restorePartner.mutateAsync(id);
      }
      addToast({ type: 'success', title: `「${name}」を復元しました` });
    } catch {
      addToast({ type: 'error', title: '復元に失敗しました' });
    }
  };

  const isLoading = activeTab === 'projects' ? loadingProjects
    : activeTab === 'tasks' ? loadingTasks
    : loadingPartners;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ゴミ箱</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {activeTab === 'projects' && (
            <>
              {(!deletedProjects || deletedProjects.length === 0) ? (
                <p className="py-12 text-center text-gray-500 dark:text-gray-400">削除済みの案件はありません</p>
              ) : (
                deletedProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{project.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        削除日: {formatDate(project.deletedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestore('projects', project.id, project.name)}
                      disabled={restoreProject.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      復元
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'tasks' && (
            <>
              {(!deletedTasks || deletedTasks.length === 0) ? (
                <p className="py-12 text-center text-gray-500 dark:text-gray-400">削除済みのタスクはありません</p>
              ) : (
                deletedTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        削除日: {formatDate(task.deletedAt)}
                        {task.project && <> / 案件: {task.project.name}</>}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestore('tasks', task.id, task.title)}
                      disabled={restoreTask.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      復元
                    </button>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'partners' && (
            <>
              {(!deletedPartners || deletedPartners.length === 0) ? (
                <p className="py-12 text-center text-gray-500 dark:text-gray-400">削除済みのパートナーはありません</p>
              ) : (
                deletedPartners.map((partner) => (
                  <div key={partner.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{partner.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        削除日: {formatDate(partner.deletedAt)}
                        {partner.companyName && <> / {partner.companyName}</>}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestore('partners', partner.id, partner.name)}
                      disabled={restorePartner.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      復元
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
