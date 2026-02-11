import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useCreateTask, useUpdateTask, useTask, useProject, usePartners } from '@/hooks';
import type { TaskInput, TaskStatus, Priority } from '@/types';
import { getUserDisplayName } from '@/types';
import {
  Button,
  Input,
  TextArea,
  Select,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Alert,
  PageLoading,
} from '@/components/common';

const STATUS_OPTIONS = [
  { value: 'todo', label: '未着手' },
  { value: 'in_progress', label: '進行中' },
  { value: 'in_review', label: 'レビュー' },
  { value: 'completed', label: '完了' },
  { value: 'blocked', label: 'ブロック' },
  { value: 'cancelled', label: 'キャンセル' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '緊急' },
];

interface FormErrors {
  title?: string;
  description?: string;
  dueDate?: string;
  estimatedHours?: string;
}

export function TaskCreatePage() {
  const navigate = useNavigate();
  const { id: projectId, taskId } = useParams<{ id: string; taskId?: string }>();

  const isEditMode = !!taskId;

  const { data: taskData, isLoading: isLoadingTask } = useTask(taskId);
  const { data: projectData, isLoading: isLoadingProject } = useProject(projectId);
  const { data: partnersData } = usePartners({ pageSize: 100 });
  const { mutate: createTask, isPending: isCreating, error: createError } = useCreateTask();
  const { mutate: updateTask, isPending: isUpdating, error: updateError } = useUpdateTask();

  const [formData, setFormData] = useState<TaskInput>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    projectId: projectId || '',
    assigneeId: undefined,
    partnerId: undefined,
    dueDate: undefined,
    estimatedHours: undefined,
    tags: [],
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  // Populate form data when editing
  useEffect(() => {
    if (isEditMode && taskData) {
      setFormData({
        title: taskData.title,
        description: taskData.description || '',
        status: taskData.status,
        priority: taskData.priority,
        projectId: taskData.projectId,
        assigneeId: taskData.assigneeId,
        partnerId: (taskData as any).partnerId,
        dueDate: taskData.dueDate?.split('T')[0],
        estimatedHours: taskData.estimatedHours,
        tags: Array.isArray(taskData.tags) ? taskData.tags : [],
      });
    }
  }, [isEditMode, taskData]);

  // Get project manager/owner for assignee selection
  const project = projectData;
  const memberOptions = [
    { value: '', label: '未割当' },
    ...(project?.manager ? [{ value: project.managerId || '', label: getUserDisplayName(project.manager) }] : []),
    ...(project?.owner && project.ownerId !== project.managerId
      ? [{ value: project.ownerId || '', label: getUserDisplayName(project.owner) }]
      : []),
  ];

  const partnerOptions = [
    { value: '', label: 'パートナー未割当' },
    ...(partnersData?.data || []).map((p: { id: string; name: string }) => ({ value: p.id, label: p.name })),
  ];

  const isPending = isCreating || isUpdating;
  const error = createError || updateError;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'タスク名は必須です';
    } else if (formData.title.length > 200) {
      newErrors.title = 'タスク名は200文字以内で入力してください';
    }

    if (formData.estimatedHours !== undefined && formData.estimatedHours < 0) {
      newErrors.estimatedHours = '見積時間は0以上の数値を入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isEditMode && taskId) {
      updateTask(
        { id: taskId, data: formData },
        {
          onSuccess: () => {
            navigate(`/projects/${projectId}/tasks/${taskId}`);
          },
        }
      );
    } else {
      createTask(formData, {
        onSuccess: (response) => {
          navigate(`/projects/${projectId}/tasks/${response.id}`);
        },
      });
    }
  };

  const handleChange = (
    field: keyof TaskInput,
    value: string | number | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    const currentTags = Array.isArray(formData.tags) ? formData.tags : [];
    if (tag && !currentTags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...(Array.isArray(prev.tags) ? prev.tags : []), tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: (Array.isArray(prev.tags) ? prev.tags : []).filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (isEditMode && isLoadingTask) {
    return <PageLoading />;
  }

  if (isLoadingProject) {
    return <PageLoading />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={isEditMode ? `/projects/${projectId}/tasks/${taskId}` : `/projects/${projectId}`}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="戻る"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'タスク編集' : '新規タスク作成'}
          </h1>
          <p className="text-gray-600">
            {project?.name && `案件: ${project.name}`}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          {isEditMode
            ? 'タスクの更新に失敗しました。入力内容を確認してください。'
            : 'タスクの作成に失敗しました。入力内容を確認してください。'}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>タスク情報</CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <Input
              label="タスク名"
              name="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={errors.title}
              placeholder="タスク名を入力"
              required
            />

            {/* Description */}
            <TextArea
              label="説明"
              name="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              error={errors.description}
              placeholder="タスクの詳細を入力"
              rows={4}
            />

            <div className="grid-form">
              {/* Status */}
              <Select
                label="ステータス"
                name="status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as TaskStatus)}
                options={STATUS_OPTIONS}
              />

              {/* Priority */}
              <Select
                label="優先度"
                name="priority"
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value as Priority)}
                options={PRIORITY_OPTIONS}
              />
            </div>

            <div className="grid-form">
              {/* Assignee */}
              <Select
                label="担当者"
                name="assigneeId"
                value={formData.assigneeId || ''}
                onChange={(e) => handleChange('assigneeId', e.target.value || undefined)}
                options={memberOptions}
                helperText="案件メンバーから選択"
              />

              {/* Partner */}
              <Select
                label="パートナー"
                name="partnerId"
                value={formData.partnerId || ''}
                onChange={(e) => handleChange('partnerId', e.target.value || undefined)}
                options={partnerOptions}
                helperText="担当パートナーを選択"
              />

              {/* Due Date */}
              <Input
                label="期限"
                name="dueDate"
                type="date"
                value={formData.dueDate || ''}
                onChange={(e) => handleChange('dueDate', e.target.value || undefined)}
                error={errors.dueDate}
              />
            </div>

            {/* Estimated Hours */}
            <Input
              label="見積時間"
              name="estimatedHours"
              type="number"
              value={formData.estimatedHours || ''}
              onChange={(e) =>
                handleChange('estimatedHours', e.target.value ? Number(e.target.value) : undefined)
              }
              error={errors.estimatedHours}
              placeholder="0"
              helperText="時間単位"
            />

            {/* Tags */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                タグ
              </label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="タグを入力してEnter"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                >
                  追加
                </Button>
              </div>
              {Array.isArray(formData.tags) && formData.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="rounded-full p-0.5 hover:bg-gray-200"
                        aria-label={`${tag}を削除`}
                      >
                        <span className="h-3 w-3 block text-xs">&times;</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                navigate(
                  isEditMode
                    ? `/projects/${projectId}/tasks/${taskId}`
                    : `/projects/${projectId}`
                )
              }
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              isLoading={isPending}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {isEditMode ? '更新' : '作成'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
