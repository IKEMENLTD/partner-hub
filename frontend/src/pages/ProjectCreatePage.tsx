import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, X, Plus } from 'lucide-react';
import { useCreateProject, useUpdateProject, useProject, usePartners, useIncrementTemplateUsage } from '@/hooks';
import type { ProjectInput, ProjectStatus, Priority, CustomFieldDefinition, CustomFieldValue, CustomFieldTemplate } from '@/types';
import {
  CustomFieldBuilder,
  CustomFieldRenderer,
  CustomFieldTemplateSelect,
  SaveTemplateModal,
} from '@/components/custom-fields';
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
  { value: 'draft', label: '下書き' },
  { value: 'planning', label: '計画中' },
  { value: 'in_progress', label: '進行中' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '緊急' },
];

interface FormErrors {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
}

export function ProjectCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const { data: projectData, isLoading: isLoadingProject } = useProject(id);
  const { mutate: createProject, isPending: isCreating, error: createError } = useCreateProject();
  const { mutate: updateProject, isPending: isUpdating, error: updateError } = useUpdateProject();
  const { data: partnersData } = usePartners({ pageSize: 100 });

  const isPending = isCreating || isUpdating;
  const error = createError || updateError;

  const [formData, setFormData] = useState<ProjectInput>({
    name: '',
    description: '',
    status: 'draft',
    priority: 'medium',
    startDate: new Date().toISOString().split('T')[0],
    endDate: undefined,
    budget: undefined,
    partnerIds: [],
    tags: [],
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  // カスタムフィールド関連の状態
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValue[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showCustomFieldBuilder, setShowCustomFieldBuilder] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const { mutate: incrementTemplateUsage } = useIncrementTemplateUsage();

  // Load existing project data when editing
  useEffect(() => {
    if (isEditMode && projectData) {
      setFormData({
        name: projectData.name,
        description: projectData.description || '',
        status: projectData.status,
        priority: projectData.priority,
        projectType: projectData.projectType,
        companyRole: projectData.companyRole,
        startDate: projectData.startDate?.split('T')[0] || '',
        endDate: projectData.endDate?.split('T')[0],
        budget: projectData.budget,
        ownerId: projectData.ownerId,
        managerId: projectData.managerId,
        partnerIds: projectData.partners?.map((p: { id: string }) => p.id) || [],
        tags: Array.isArray(projectData.tags) ? projectData.tags : [],
      });

      // カスタムフィールドデータを読み込み
      const metadata = projectData.metadata as { customFields?: CustomFieldValue[]; customFieldTemplateId?: string } | undefined;
      if (metadata?.customFields) {
        setCustomFieldValues(metadata.customFields);
        // 値からフィールド定義を再構築
        const fieldsFromValues: CustomFieldDefinition[] = metadata.customFields.map((v, i) => ({
          id: v.fieldId,
          name: v.name,
          type: v.type,
          required: false,
          order: i,
        }));
        setCustomFields(fieldsFromValues);
        if (fieldsFromValues.length > 0) {
          setShowCustomFieldBuilder(true);
        }
      }
      if (metadata?.customFieldTemplateId) {
        setSelectedTemplateId(metadata.customFieldTemplateId);
      }
    }
  }, [isEditMode, projectData]);

  const partners = partnersData?.data || [];
  const partnerOptions = [
    { value: '', label: '選択なし' },
    ...partners.map((p) => ({ value: p.id, label: p.companyName || p.name })),
  ];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '案件名は必須です';
    } else if (formData.name.length > 200) {
      newErrors.name = '案件名は200文字以内で入力してください';
    }

    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      newErrors.endDate = '終了日は開始日より後の日付を選択してください';
    }

    if (formData.budget !== undefined && formData.budget < 0) {
      newErrors.budget = '予算は0以上の数値を入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // カスタムフィールドをmetadataに含める
    const metadata: Record<string, unknown> = {
      ...(formData.metadata || {}),
    };

    // 値が入力されているカスタムフィールドのみ保存
    const filledValues = customFieldValues.filter((v) => v.value !== null && v.value !== '');
    if (filledValues.length > 0) {
      metadata.customFields = filledValues;
    }
    if (selectedTemplateId) {
      metadata.customFieldTemplateId = selectedTemplateId;
    }

    const submitData: ProjectInput = {
      ...formData,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };

    if (isEditMode && id) {
      updateProject(
        { id, data: submitData },
        {
          onSuccess: (response) => {
            navigate(`/projects/${response.id}`);
          },
        }
      );
    } else {
      createProject(submitData, {
        onSuccess: (response) => {
          // カスタムフィールドがあり、新規テンプレートとして保存する場合
          if (customFields.length > 0 && !selectedTemplateId) {
            setPendingNavigation(`/projects/${response.id}`);
            setShowSaveTemplateModal(true);
          } else {
            navigate(`/projects/${response.id}`);
          }
        },
      });
    }
  };

  const handleChange = (
    field: keyof ProjectInput,
    value: string | number | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    const currentTags = formData.tags || [];
    if (tag && !currentTags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...currentTags, tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // テンプレート選択時のハンドラー
  const handleTemplateSelect = (template: CustomFieldTemplate | null) => {
    if (template) {
      setSelectedTemplateId(template.id);
      setCustomFields(template.fields);
      // 空の値で初期化
      setCustomFieldValues(
        template.fields.map((f) => ({
          fieldId: f.id,
          name: f.name,
          type: f.type,
          value: null,
        }))
      );
      setShowCustomFieldBuilder(true);
      // 使用回数をインクリメント
      incrementTemplateUsage(template.id);
    } else {
      setSelectedTemplateId(null);
      setCustomFields([]);
      setCustomFieldValues([]);
    }
  };

  if (isEditMode && isLoadingProject) {
    return <PageLoading />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/projects"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="案件一覧に戻る"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? '案件編集' : '新規案件作成'}
          </h1>
          <p className="text-gray-600">
            {isEditMode ? '案件の情報を更新してください' : '案件の基本情報を入力してください'}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          {isEditMode
            ? '案件の更新に失敗しました。入力内容を確認してください。'
            : '案件の作成に失敗しました。入力内容を確認してください。'}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>基本情報</CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <Input
              label="案件名"
              name="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={errors.name}
              placeholder="案件名を入力"
              required
            />

            {/* Description */}
            <TextArea
              label="説明"
              name="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              error={errors.description}
              placeholder="案件の概要や目的を入力"
              rows={4}
              required
            />

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Status */}
              <Select
                label="ステータス"
                name="status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as ProjectStatus)}
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

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Start Date */}
              <Input
                label="開始日"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                error={errors.startDate}
                required
              />

              {/* End Date */}
              <Input
                label="終了日"
                name="endDate"
                type="date"
                value={formData.endDate || ''}
                onChange={(e) => handleChange('endDate', e.target.value || undefined)}
                error={errors.endDate}
                helperText="省略可能"
              />
            </div>

            {/* Budget */}
            <Input
              label="予算"
              name="budget"
              type="number"
              value={formData.budget || ''}
              onChange={(e) =>
                handleChange('budget', e.target.value ? Number(e.target.value) : undefined)
              }
              error={errors.budget}
              placeholder="0"
              helperText="円単位"
            />

            {/* Partner */}
            <Select
              label="パートナー"
              name="partnerIds"
              value={formData.partnerIds?.[0] || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                partnerIds: e.target.value ? [e.target.value] : []
              }))}
              options={partnerOptions}
              helperText="案件を担当するパートナーを選択"
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
              {(formData.tags?.length ?? 0) > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(formData.tags || []).map((tag) => (
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
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* カスタムフィールドセクション */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">カスタムフィールド</h3>
                {!showCustomFieldBuilder && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomFieldBuilder(true)}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    フィールドを追加
                  </Button>
                )}
              </div>

              {showCustomFieldBuilder && (
                <div className="space-y-4">
                  {/* テンプレート選択 */}
                  <CustomFieldTemplateSelect
                    value={selectedTemplateId}
                    onChange={handleTemplateSelect}
                  />

                  {/* フィールド値入力 */}
                  {customFields.length > 0 && (
                    <div className="rounded-lg border border-gray-200 p-4">
                      <CustomFieldRenderer
                        fields={customFields}
                        values={customFieldValues}
                        onChange={setCustomFieldValues}
                      />
                    </div>
                  )}

                  {/* フィールド追加・編集 */}
                  <div className="rounded-lg border-2 border-dashed border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">
                      フィールドを追加・編集
                    </div>
                    <CustomFieldBuilder
                      fields={customFields}
                      onChange={(newFields) => {
                        setCustomFields(newFields);
                        // テンプレートから外れた場合はIDをクリア
                        setSelectedTemplateId(null);
                        // 新しいフィールドに対応する値を追加
                        setCustomFieldValues((prev) => {
                          const existingIds = prev.map((v) => v.fieldId);
                          const newValues = [...prev];
                          newFields.forEach((f) => {
                            if (!existingIds.includes(f.id)) {
                              newValues.push({
                                fieldId: f.id,
                                name: f.name,
                                type: f.type,
                                value: null,
                              });
                            }
                          });
                          // 削除されたフィールドの値を除去
                          const newFieldIds = newFields.map((f) => f.id);
                          return newValues.filter((v) => newFieldIds.includes(v.fieldId));
                        });
                      }}
                    />
                  </div>

                  {/* 折りたたみボタン */}
                  {customFields.length === 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCustomFieldBuilder(false)}
                    >
                      カスタムフィールドを閉じる
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/projects')}
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

      {/* テンプレート保存モーダル */}
      <SaveTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => {
          setShowSaveTemplateModal(false);
          if (pendingNavigation) {
            navigate(pendingNavigation);
            setPendingNavigation(null);
          }
        }}
        fields={customFields}
        onSaved={() => {
          if (pendingNavigation) {
            navigate(pendingNavigation);
            setPendingNavigation(null);
          }
        }}
      />
    </div>
  );
}
