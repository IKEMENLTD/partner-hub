import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Clock,
  User,
  CheckSquare,
  MessageSquare,
  Plus,
  Send,
} from 'lucide-react';
import { useTask, useUpdateTask, useDeleteTask, useAddComment, useAddSubtask, useToggleSubtask } from '@/hooks';
import type { TaskStatus } from '@/types';
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
  Select,
  Input,
  TextArea,
  Modal,
  ModalFooter,
} from '@/components/common';
import clsx from 'clsx';

const statusConfig = {
  todo: { label: '未着手', variant: 'default' as const },
  in_progress: { label: '進行中', variant: 'primary' as const },
  in_review: { label: 'レビュー', variant: 'warning' as const },
  completed: { label: '完了', variant: 'success' as const },
  blocked: { label: 'ブロック', variant: 'danger' as const },
  cancelled: { label: 'キャンセル', variant: 'default' as const },
};

const priorityConfig = {
  low: { label: '低', variant: 'default' as const },
  medium: { label: '中', variant: 'info' as const },
  high: { label: '高', variant: 'warning' as const },
  urgent: { label: '緊急', variant: 'danger' as const },
};

const STATUS_OPTIONS = [
  { value: 'todo', label: '未着手' },
  { value: 'in_progress', label: '進行中' },
  { value: 'in_review', label: 'レビュー' },
  { value: 'completed', label: '完了' },
  { value: 'blocked', label: 'ブロック' },
  { value: 'cancelled', label: 'キャンセル' },
];

export function TaskDetailPage() {
  const { id: projectId, taskId } = useParams<{ id: string; taskId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useTask(taskId);
  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask();
  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask();
  const { mutate: addComment, isPending: isAddingComment } = useAddComment();
  const { mutate: addSubtask, isPending: isAddingSubtask } = useAddSubtask();
  const { mutate: toggleSubtask } = useToggleSubtask();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="タスクの読み込みに失敗しました"
        retry={() => refetch()}
      />
    );
  }

  const task = data;
  if (!task) {
    return (
      <ErrorMessage message="タスクが見つかりません" />
    );
  }

  const status = statusConfig[task.status];
  const priority = priorityConfig[task.priority];

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateTask({ id: task.id, data: { status: newStatus } });
  };

  const handleDelete = () => {
    deleteTask(task.id, {
      onSuccess: () => {
        navigate(`/projects/${projectId}`);
      },
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    addComment(
      { taskId: task.id, content: newComment },
      {
        onSuccess: () => {
          setNewComment('');
        },
      }
    );
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;

    addSubtask(
      { taskId: task.id, title: newSubtask },
      {
        onSuccess: () => {
          setNewSubtask('');
        },
      }
    );
  };

  const handleToggleSubtask = (subtaskId: string) => {
    toggleSubtask({ taskId: task.id, subtaskId });
  };

  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          案件に戻る
        </Link>

        <div className="page-header sm:!items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge variant={priority.variant}>{priority.label}</Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              leftIcon={<Edit className="h-4 w-4" />}
              as={Link}
              to={`/projects/${projectId}/tasks/${task.id}/edit`}
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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="text-center">
          <Calendar className="h-5 w-5 mx-auto text-gray-400 mb-2" />
          <p className="text-xs text-gray-500">期限</p>
          <p className="text-sm font-medium text-gray-900">
            {task.dueDate
              ? format(new Date(task.dueDate), 'yyyy/M/d', { locale: ja })
              : '未設定'}
          </p>
        </Card>
        <Card className="text-center">
          <Clock className="h-5 w-5 mx-auto text-gray-400 mb-2" />
          <p className="text-xs text-gray-500">見積時間</p>
          <p className="text-sm font-medium text-gray-900">
            {task.estimatedHours ? `${task.estimatedHours}h` : '未設定'}
          </p>
        </Card>
        <Card className="text-center">
          <User className="h-5 w-5 mx-auto text-gray-400 mb-2" />
          <p className="text-xs text-gray-500">担当者</p>
          <p className="text-sm font-medium text-gray-900">
            {task.assignee ? getUserDisplayName(task.assignee) : '未割当'}
          </p>
        </Card>
        <Card className="text-center">
          <CheckSquare className="h-5 w-5 mx-auto text-gray-400 mb-2" />
          <p className="text-xs text-gray-500">サブタスク</p>
          <p className="text-sm font-medium text-gray-900">
            {completedSubtasks}/{totalSubtasks}
          </p>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>説明</CardHeader>
            <CardContent>
              {task.description ? (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {task.description}
                </p>
              ) : (
                <p className="text-gray-400 italic">説明がありません</p>
              )}
            </CardContent>
          </Card>

          {/* Subtasks */}
          <Card>
            <CardHeader>サブタスク</CardHeader>
            <CardContent>
              {totalSubtasks > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">進捗</span>
                    <span className="text-sm font-medium text-gray-900">{subtaskProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-primary-500 transition-all"
                      style={{ width: `${subtaskProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {task.subtasks && task.subtasks.length > 0 ? (
                <ul className="space-y-2 mb-4">
                  {task.subtasks.map((subtask) => (
                    <li key={subtask.id} className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleSubtask(subtask.id)}
                        className={clsx(
                          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors',
                          subtask.completed
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-gray-300 hover:border-primary-500'
                        )}
                        aria-label={subtask.completed ? 'サブタスクを未完了にする' : 'サブタスクを完了にする'}
                      >
                        {subtask.completed && <CheckSquare className="h-3 w-3" />}
                      </button>
                      <span
                        className={clsx(
                          'text-sm',
                          subtask.completed ? 'text-gray-400 line-through' : 'text-gray-700'
                        )}
                      >
                        {subtask.title}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 italic mb-4">サブタスクがありません</p>
              )}

              {/* Add subtask form */}
              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="新しいサブタスク"
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  isLoading={isAddingSubtask}
                  disabled={!newSubtask.trim()}
                >
                  追加
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                コメント ({task.comments?.length || 0})
              </div>
            </CardHeader>
            <CardContent>
              {task.comments && task.comments.length > 0 ? (
                <ul className="space-y-4 mb-4">
                  {task.comments.map((comment) => (
                    <li key={comment.id} className="flex gap-3">
                      <Avatar
                        name={getUserDisplayName(comment.author)}
                        src={comment.author.avatarUrl}
                        size="sm"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {getUserDisplayName(comment.author)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(comment.createdAt), 'M/d HH:mm', { locale: ja })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 italic mb-4">コメントがありません</p>
              )}

              {/* Add comment form */}
              <form onSubmit={handleAddComment}>
                <TextArea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="コメントを入力..."
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    leftIcon={<Send className="h-4 w-4" />}
                    isLoading={isAddingComment}
                    disabled={!newComment.trim()}
                  >
                    送信
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Change */}
          <Card>
            <CardHeader>ステータス変更</CardHeader>
            <CardContent>
              <Select
                options={STATUS_OPTIONS}
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                disabled={isUpdating}
              />
            </CardContent>
          </Card>

          {/* Assignee */}
          {task.assignee && (
            <Card>
              <CardHeader>担当者</CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar
                    name={getUserDisplayName(task.assignee)}
                    src={task.assignee.avatarUrl}
                    size="md"
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      {getUserDisplayName(task.assignee)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {task.assignee.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {Array.isArray(task.tags) && task.tags.length > 0 && (
            <Card>
              <CardHeader>タグ</CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag: string) => (
                    <Badge key={tag} variant="default">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card>
            <CardHeader>作成日時</CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                {format(new Date(task.createdAt), 'yyyy/M/d HH:mm', { locale: ja })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                更新: {format(new Date(task.updatedAt), 'yyyy/M/d HH:mm', { locale: ja })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="タスクの削除"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          「{task.title}」を削除しますか？
          この操作は取り消せません。
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
    </div>
  );
}
