import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Users,
  Clock,
  Building,
  FileText,
  CheckSquare,
  History,
  Paperclip,
  Upload,
} from 'lucide-react';
import {
  useProject,
  useProjectTimeline,
  useDeleteProject,
  useUpdateTaskStatus,
  useBulkCreateTasks,
  useStakeholderTree,
  useProjectStakeholders,
  useAddStakeholder,
  useUpdateStakeholder,
  useDeleteStakeholder,
  useProjectFiles,
  useUploadFile,
  useDeleteFile,
  useGetDownloadUrl,
  useProjectTasks,
} from '@/hooks';
import type { ProjectDetailTab, TaskStatus, ProjectStakeholder, StakeholderInput } from '@/types';
import { getUserDisplayName } from '@/types';
import {
  Button,
  Badge,
  Avatar,
  Card,
  CardHeader,
  CardContent,
  PageLoading,
  ErrorMessage,
  Tabs,
  TabList,
  TabPanel,
  Modal,
  ModalFooter,
} from '@/components/common';
import { TaskList, BulkAddTaskModal } from '@/components/task';
import { ProjectTimeline, HealthScoreCardDisplay, HealthScoreBreakdown } from '@/components/project';
import {
  StakeholderTree,
  AddStakeholderModal,
  DeleteStakeholderModal,
} from '@/components/stakeholders';
import { FileUpload, FileList } from '@/components/files';
import { addToRecentProjects } from '@/hooks/useRecentProjects';

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

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useProject(id);
  const { data: timelineData } = useProjectTimeline(id);
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject();
  const { mutate: updateTaskStatus } = useUpdateTaskStatus();
  const { mutate: bulkCreateTasks, isPending: isBulkCreating } = useBulkCreateTasks();

  // ステークホルダー関連
  const { data: stakeholderTree, isLoading: isLoadingStakeholders } = useStakeholderTree(id);
  const { data: stakeholders } = useProjectStakeholders(id);
  const { mutate: addStakeholder, isPending: isAddingStakeholder } = useAddStakeholder();
  const { mutate: updateStakeholder, isPending: isUpdatingStakeholder } = useUpdateStakeholder();
  const { mutate: deleteStakeholder, isPending: isDeletingStakeholder } = useDeleteStakeholder();

  // ファイル関連
  const { data: filesData, isLoading: isLoadingFiles } = useProjectFiles(id);
  const { mutate: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutate: deleteFile, isPending: isDeletingFile } = useDeleteFile();
  const { mutate: getDownloadUrl } = useGetDownloadUrl();

  // タスク関連
  const { data: tasksData } = useProjectTasks(id);

  const [activeTab, setActiveTab] = useState<ProjectDetailTab>('overview');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);

  // ステークホルダーモーダル状態
  const [showAddStakeholderModal, setShowAddStakeholderModal] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<ProjectStakeholder | null>(null);
  const [deletingStakeholder, setDeletingStakeholder] = useState<ProjectStakeholder | null>(null);

  // Add to recent projects when page is viewed
  useEffect(() => {
    if (id) {
      addToRecentProjects(id);
    }
  }, [id]);

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="案件の読み込みに失敗しました"
        retry={() => refetch()}
      />
    );
  }

  const project = data;
  if (!project) {
    return (
      <ErrorMessage message="案件が見つかりません" />
    );
  }

  const status = statusConfig[project.status];
  const priority = priorityConfig[project.priority];
  const timeline: import('@/types').TimelineEvent[] = Array.isArray(timelineData) ? timelineData : [];

  const progress = project.progress ?? 0;

  const handleDelete = () => {
    deleteProject(project.id, {
      onSuccess: () => {
        navigate('/projects');
      },
    });
  };

  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTaskStatus({ id: taskId, status: newStatus });
  };

  // ステークホルダー追加/編集ハンドラー
  const handleAddStakeholder = (data: StakeholderInput) => {
    if (editingStakeholder) {
      updateStakeholder(
        {
          projectId: project.id,
          stakeholderId: editingStakeholder.id,
          data,
        },
        {
          onSuccess: () => {
            setShowAddStakeholderModal(false);
            setEditingStakeholder(null);
          },
        }
      );
    } else {
      addStakeholder(data, {
        onSuccess: () => {
          setShowAddStakeholderModal(false);
        },
      });
    }
  };

  // ステークホルダー削除ハンドラー
  const handleDeleteStakeholder = () => {
    if (!deletingStakeholder) return;
    deleteStakeholder(
      {
        projectId: project.id,
        stakeholderId: deletingStakeholder.id,
      },
      {
        onSuccess: () => {
          setDeletingStakeholder(null);
        },
      }
    );
  };

  // ステークホルダー編集を開く
  const handleEditStakeholder = (stakeholder: ProjectStakeholder) => {
    setEditingStakeholder(stakeholder);
    setShowAddStakeholderModal(true);
  };

  // ファイルアップロードハンドラー
  const handleFileUpload = (file: File, projectId: string, taskId?: string) => {
    uploadFile(
      { file, projectId, taskId },
      {
        onSuccess: () => {
          setShowFileUpload(false);
        },
      }
    );
  };

  // ファイル削除ハンドラー
  const handleFileDelete = (fileId: string) => {
    deleteFile({ fileId, projectId: project.id });
  };

  // ファイルダウンロードハンドラー
  const handleFileDownload = (fileId: string) => {
    getDownloadUrl(
      { fileId },
      {
        onSuccess: (data) => {
          window.open(data.signedUrl, '_blank');
        },
      }
    );
  };

  const tabs = [
    { id: 'overview' as const, label: '概要', icon: <FileText className="h-4 w-4" /> },
    { id: 'members' as const, label: '関係者', icon: <Users className="h-4 w-4" />, badge: stakeholders?.length || undefined },
    { id: 'tasks' as const, label: 'タスク', icon: <CheckSquare className="h-4 w-4" /> },
    { id: 'timeline' as const, label: 'タイムライン', icon: <History className="h-4 w-4" /> },
    { id: 'files' as const, label: 'ファイル', icon: <Paperclip className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          案件一覧に戻る
        </Link>

        <div className="page-header sm:!items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge variant={priority.variant}>{priority.label}</Badge>
            </div>
            {project.partners && project.partners.length > 0 && (
              <p className="mt-1 text-gray-600">
                <Building className="inline h-4 w-4 mr-1" />
                {project.partners.map((p: import('@/types').Partner) => p.companyName || p.name).join(', ')}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              leftIcon={<Edit className="h-4 w-4" />}
              as={Link}
              to={`/projects/${project.id}/edit`}
            >
              編集
            </Button>
            <Button
              variant="danger"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => setShowDeleteConfirm(true)}
            >
              削除
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid-stats">
        <Card className="text-center">
          <Calendar className="h-5 w-5 mx-auto text-gray-400 mb-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400">開始日</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {format(new Date(project.startDate), 'yyyy/M/d', { locale: ja })}
          </p>
        </Card>
        <Card className="text-center">
          <Clock className="h-5 w-5 mx-auto text-gray-400 mb-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400">終了日</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {project.endDate
              ? format(new Date(project.endDate), 'yyyy/M/d', { locale: ja })
              : '未設定'}
          </p>
        </Card>
        <Card className="text-center">
          <Users className="h-5 w-5 mx-auto text-gray-400 mb-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400">パートナー</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {project.partners?.length || 0} 社
          </p>
        </Card>
        <Card className="text-center">
          <CheckSquare className="h-5 w-5 mx-auto text-gray-400 mb-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400">進捗</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {progress}%
          </p>
        </Card>
        {project.healthScore !== undefined && project.status !== 'draft' && project.status !== 'planning' && (
          <Card className="text-center">
            <HealthScoreCardDisplay score={project.healthScore} />
          </Card>
        )}
      </div>

      {/* Tabs */}
      <Tabs activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as ProjectDetailTab)}>
        <TabList tabs={tabs} />

        {/* Overview Tab */}
        <TabPanel id="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <Card>
                <CardHeader>説明</CardHeader>
                <CardContent>
                  {project.description ? (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {project.description}
                    </p>
                  ) : (
                    <p className="text-gray-400 italic">説明がありません</p>
                  )}
                </CardContent>
              </Card>

              {/* Progress */}
              <Card>
                <CardHeader>タスク進捗</CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">完了率</span>
                    <span className="text-lg font-bold text-gray-900">{progress}%</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-gray-200">
                    <div
                      className="h-3 rounded-full bg-primary-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">現在の進捗率</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Health Score Breakdown */}
              {project.healthScore !== undefined && project.status !== 'draft' && project.status !== 'planning' && (
                <Card>
                  <CardHeader>案件ヘルススコア</CardHeader>
                  <CardContent>
                    <HealthScoreBreakdown
                      onTimeRate={project.onTimeRate ?? 0}
                      completionRate={project.completionRate ?? 0}
                      budgetHealth={project.budgetHealth ?? 0}
                      overallScore={project.healthScore}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Manager */}
              {project.manager && (
                <Card>
                  <CardHeader>担当マネージャー</CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={getUserDisplayName(project.manager)}
                        src={project.manager.avatarUrl}
                        size="md"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {getUserDisplayName(project.manager)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {project.manager.email}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Partners */}
              {project.partners && project.partners.length > 0 && (
                <Card>
                  <CardHeader>パートナー</CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {project.partners.map((partner: import('@/types').Partner) => (
                        <Link
                          key={partner.id}
                          to={`/partners/${partner.id}`}
                          className="block hover:bg-gray-50 -m-2 p-2 rounded-lg transition-colors"
                        >
                          <p className="font-medium text-gray-900">
                            {partner.name}
                          </p>
                          {partner.companyName && (
                            <p className="text-sm text-gray-500">
                              {partner.companyName}
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Budget */}
              {project.budget && (
                <Card>
                  <CardHeader>予算</CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-gray-900">
                      ¥{Math.floor(project.budget).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Tags */}
              {Array.isArray(project.tags) && project.tags.length > 0 && (
                <Card>
                  <CardHeader>タグ</CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag: string) => (
                        <Badge key={tag} variant="default">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabPanel>

        {/* Stakeholders Tab */}
        <TabPanel id="members" className="mt-6">
          <StakeholderTree
            tree={stakeholderTree || []}
            isLoading={isLoadingStakeholders}
            onAdd={() => {
              setEditingStakeholder(null);
              setShowAddStakeholderModal(true);
            }}
            onEdit={handleEditStakeholder}
            onDelete={setDeletingStakeholder}
            onSelect={handleEditStakeholder}
          />
        </TabPanel>

        {/* Tasks Tab */}
        <TabPanel id="tasks" className="mt-6">
          <TaskList
            tasks={tasksData?.data || []}
            onTaskStatusChange={handleTaskStatusChange}
            onTaskClick={(task) => navigate(`/projects/${project.id}/tasks/${task.id}`)}
            onAddTask={() => navigate(`/projects/${project.id}/tasks/new`)}
            onBulkAddTask={() => setShowBulkAddModal(true)}
            showFilters
          />
        </TabPanel>

        {/* Timeline Tab */}
        <TabPanel id="timeline" className="mt-6">
          <ProjectTimeline events={timeline} />
        </TabPanel>

        {/* Files Tab */}
        <TabPanel id="files" className="mt-6">
          <div className="space-y-6">
            {/* Upload Section */}
            <Card>
              <CardHeader
                action={
                  <Button
                    variant={showFileUpload ? 'ghost' : 'outline'}
                    size="sm"
                    leftIcon={<Upload className="h-4 w-4" />}
                    onClick={() => setShowFileUpload(!showFileUpload)}
                  >
                    {showFileUpload ? '閉じる' : 'アップロード'}
                  </Button>
                }
              >
                ファイルアップロード
              </CardHeader>
              {showFileUpload && (
                <CardContent>
                  <FileUpload
                    projectId={project.id}
                    onUpload={handleFileUpload}
                    isUploading={isUploading}
                  />
                </CardContent>
              )}
            </Card>

            {/* File List */}
            <Card>
              <CardHeader>ファイル一覧</CardHeader>
              <CardContent>
                <FileList
                  files={filesData || []}
                  isLoading={isLoadingFiles}
                  onDelete={handleFileDelete}
                  onDownload={handleFileDownload}
                  isDeleting={isDeletingFile}
                />
              </CardContent>
            </Card>
          </div>
        </TabPanel>
      </Tabs>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="案件の削除"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          「{project.name}」を削除しますか？
          この操作は取り消せません。関連するすべてのタスクも削除されます。
        </p>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            削除
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add/Edit Stakeholder Modal */}
      <AddStakeholderModal
        isOpen={showAddStakeholderModal}
        onClose={() => {
          setShowAddStakeholderModal(false);
          setEditingStakeholder(null);
        }}
        onSubmit={handleAddStakeholder}
        projectId={project.id}
        existingStakeholders={Array.isArray(stakeholders) ? stakeholders : (stakeholders as unknown as { data?: ProjectStakeholder[] })?.data || []}
        editingStakeholder={editingStakeholder}
        isLoading={isAddingStakeholder || isUpdatingStakeholder}
      />

      {/* Bulk Add Task Modal */}
      <BulkAddTaskModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        onSubmit={(titles) => {
          bulkCreateTasks(
            { projectId: project.id, tasks: titles.map((title) => ({ title })) },
            {
              onSuccess: () => {
                setShowBulkAddModal(false);
              },
            }
          );
        }}
        isLoading={isBulkCreating}
      />

      {/* Delete Stakeholder Modal */}
      <DeleteStakeholderModal
        isOpen={!!deletingStakeholder}
        onClose={() => setDeletingStakeholder(null)}
        onConfirm={handleDeleteStakeholder}
        stakeholder={deletingStakeholder}
        isLoading={isDeletingStakeholder}
      />
    </div>
  );
}
