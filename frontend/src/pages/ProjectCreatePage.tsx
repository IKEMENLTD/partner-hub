import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, X, Plus, Building2, Trash2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useCreateProject, useUpdateProject, useProject, usePartners, useProjectStakeholders, useIncrementTemplateUsage, useProjectTemplates } from '@/hooks';
import type { ProjectInput, ProjectStatus, Priority, StakeholderTier, ProjectStakeholderInput, CustomFieldDefinition, CustomFieldValue, CustomFieldTemplate, ProjectTemplate as ProjectTemplateType } from '@/types';
import {
  CustomFieldBuilder,
  CustomFieldRenderer,
  CustomFieldTemplateSelect,
  SaveTemplateModal,
  validateCustomFields,
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

const TIER_OPTIONS = [
  { value: '1', label: 'Tier 1 - 主要関係者' },
  { value: '2', label: 'Tier 2 - 重要関係者' },
  { value: '3', label: 'Tier 3 - 一般関係者' },
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
  const { data: existingStakeholders } = useProjectStakeholders(id);
  const { data: templates, isLoading: isLoadingTemplates } = useProjectTemplates();

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
    stakeholders: [],
    tags: [],
  });

  // パートナー+Tier 選択用の状態
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [selectedTier, setSelectedTier] = useState<StakeholderTier>(1);

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({});

  // プロジェクトテンプレート関連の状態
  const [selectedProjectTemplateId, setSelectedProjectTemplateId] = useState<string>('');
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);

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
      // 既存のstakeholdersからProjectStakeholderInput[]を構築
      // APIはPaginatedResponseを返すが型定義が配列になっているため安全に取り出す
      const raw = existingStakeholders as unknown;
      const stakeholderList = Array.isArray(raw) ? raw : (raw as { data?: unknown[] })?.data || [];
      const stakeholderInputs: ProjectStakeholderInput[] = Array.isArray(stakeholderList) && stakeholderList.length > 0
        ? stakeholderList.map((s: { partnerId?: string; tier: number; roleDescription?: string; isPrimary: boolean }) => ({
            partnerId: s.partnerId || '',
            tier: (s.tier as StakeholderTier) || 1,
            roleDescription: s.roleDescription,
            isPrimary: s.isPrimary,
          })).filter((s: ProjectStakeholderInput) => s.partnerId)
        : projectData.partners?.map((p: { id: string }) => ({
            partnerId: p.id,
            tier: 1 as StakeholderTier,
          })) || [];

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
        stakeholders: stakeholderInputs,
        tags: Array.isArray(projectData.tags) ? projectData.tags : [],
      });

      // カスタムフィールドデータを読み込み
      const metadata = projectData.metadata as { customFields?: CustomFieldValue[]; customFieldDefinitions?: CustomFieldDefinition[]; customFieldTemplateId?: string } | undefined;
      if (metadata?.customFields) {
        setCustomFieldValues(metadata.customFields);
        // 保存済みのフィールド定義があればそれを使う（バリデーション設定を維持）
        if (metadata.customFieldDefinitions && metadata.customFieldDefinitions.length > 0) {
          setCustomFields(metadata.customFieldDefinitions);
        } else {
          // フォールバック: 値からフィールド定義を再構築
          const fieldsFromValues: CustomFieldDefinition[] = metadata.customFields.map((v, i) => ({
            id: v.fieldId,
            name: v.name,
            type: v.type,
            required: false,
            order: i,
          }));
          setCustomFields(fieldsFromValues);
        }
        if (metadata.customFields.length > 0) {
          setShowCustomFieldBuilder(true);
        }
      }
      if (metadata?.customFieldTemplateId) {
        setSelectedTemplateId(metadata.customFieldTemplateId);
      }
    }
  }, [isEditMode, projectData, existingStakeholders]);

  const partners = partnersData?.data || [];
  // 編集時: 削除済みパートナーをstakeholdersから除外
  useEffect(() => {
    if (isEditMode && partners.length > 0 && formData.stakeholders && formData.stakeholders.length > 0) {
      const validPartnerIds = new Set(partners.map((p) => p.id));
      const filtered = formData.stakeholders.filter((s) => validPartnerIds.has(s.partnerId));
      if (filtered.length !== formData.stakeholders.length) {
        setFormData((prev) => ({ ...prev, stakeholders: filtered }));
      }
    }
  }, [isEditMode, partners]); // eslint-disable-line react-hooks/exhaustive-deps
  // 既にstakeholdersに追加されているパートナーを除外
  const selectedPartnerIdsInStakeholders = (formData.stakeholders || []).map((s) => s.partnerId);
  const availablePartnerOptions = [
    { value: '', label: 'パートナーを選択...' },
    ...partners
      .filter((p) => !selectedPartnerIdsInStakeholders.includes(p.id))
      .map((p) => ({ value: p.id, label: p.companyName || p.name })),
  ];

  const handleAddStakeholder = () => {
    if (!selectedPartnerId) return;
    const newStakeholder: ProjectStakeholderInput = {
      partnerId: selectedPartnerId,
      tier: selectedTier,
    };
    setFormData((prev) => ({
      ...prev,
      stakeholders: [...(prev.stakeholders || []), newStakeholder],
    }));
    setSelectedPartnerId('');
    setSelectedTier(1);
  };

  const handleRemoveStakeholder = (partnerId: string) => {
    setFormData((prev) => ({
      ...prev,
      stakeholders: (prev.stakeholders || []).filter((s) => s.partnerId !== partnerId),
    }));
  };

  const getPartnerName = (partnerId: string) => {
    const partner = partners.find((p) => p.id === partnerId);
    return partner ? (partner.companyName || partner.name) : partnerId;
  };

  const getTierLabel = (tier: StakeholderTier) => {
    const option = TIER_OPTIONS.find((o) => o.value === String(tier));
    return option?.label || `Tier ${tier}`;
  };

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

    // カスタムフィールドのバリデーション
    const cfErrors = validateCustomFields(customFields, customFieldValues);
    setCustomFieldErrors(cfErrors);

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && Object.keys(cfErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // カスタムフィールドをmetadataに含める
    const metadata: Record<string, unknown> = {
      ...(formData.metadata || {}),
    };

    // カスタムフィールドがあれば保存（値が空でもフィールド定義を維持）
    if (customFields.length > 0) {
      metadata.customFields = customFieldValues;
      metadata.customFieldDefinitions = customFields;
    }
    if (selectedTemplateId) {
      metadata.customFieldTemplateId = selectedTemplateId;
    }

    // stakeholders がある場合は partnerIds を送らない（stakeholders が優先）
    const { partnerIds: _unused, ...formDataWithoutPartnerIds } = formData;

    // 削除済みパートナーを除外（存在するパートナーIDのみに絞る）
    const validPartnerIds = new Set(partners.map((p) => p.id));
    const validStakeholders = (formData.stakeholders || []).filter(
      (s) => validPartnerIds.has(s.partnerId)
    );

    const submitData: ProjectInput = {
      ...formDataWithoutPartnerIds,
      stakeholders: validStakeholders,
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

  // プロジェクトテンプレート選択時のハンドラー
  const handleProjectTemplateChange = (templateId: string) => {
    setSelectedProjectTemplateId(templateId);
    setFormData((prev) => ({
      ...prev,
      templateId: templateId || undefined,
    }));
    if (templateId) {
      setShowTemplatePreview(true);
    } else {
      setShowTemplatePreview(false);
    }
  };

  const selectedProjectTemplate = templates?.find(
    (t: ProjectTemplateType) => t.id === selectedProjectTemplateId
  );

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
        {/* プロジェクトテンプレート選択 (新規作成時のみ) */}
        {!isEditMode && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span>テンプレートから作成</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="テンプレート"
                name="projectTemplate"
                value={selectedProjectTemplateId}
                onChange={(e) => handleProjectTemplateChange(e.target.value)}
                options={[
                  { value: '', label: 'テンプレートなし' },
                  ...(templates || []).map((t: ProjectTemplateType) => ({
                    value: t.id,
                    label: t.name,
                  })),
                ]}
                disabled={isLoadingTemplates}
              />
              {selectedProjectTemplate && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-800 mb-3">
                    {selectedProjectTemplate.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTemplatePreview((prev) => !prev)}
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {showTemplatePreview ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        フェーズとタスクを非表示
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        フェーズとタスクをプレビュー
                      </>
                    )}
                  </button>
                  {showTemplatePreview && (
                    <div className="mt-3 space-y-3">
                      {[...selectedProjectTemplate.phases]
                        .sort((a, b) => a.order - b.order)
                        .map((phase) => (
                          <div key={phase.order} className="rounded-md border border-blue-100 bg-white p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-gray-900">
                                Phase {phase.order}: {phase.name}
                              </h4>
                              <span className="text-xs text-gray-500">
                                {phase.estimatedDays}日間
                              </span>
                            </div>
                            <ul className="space-y-1">
                              {[...phase.tasks]
                                .sort((a, b) => a.order - b.order)
                                .map((task) => (
                                  <li
                                    key={task.order}
                                    className="flex items-center justify-between text-sm text-gray-600 pl-3 border-l-2 border-blue-200"
                                  >
                                    <span>{task.name}</span>
                                    <span className="text-xs text-gray-400">
                                      {task.estimatedDays}日
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ))}
                      <p className="text-xs text-gray-500">
                        合計: {selectedProjectTemplate.phases.reduce(
                          (sum, p) => sum + p.tasks.reduce((s, t) => s + t.estimatedDays, 0),
                          0
                        )}日間 / {selectedProjectTemplate.phases.reduce(
                          (sum, p) => sum + p.tasks.length,
                          0
                        )}タスク
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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

            <div className="grid-form">
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

            <div className="grid-form">
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

            {/* パートナー（ステークホルダー） */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                パートナー
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    name="stakeholder-partner"
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                    options={availablePartnerOptions}
                  />
                </div>
                <div className="w-48">
                  <Select
                    name="stakeholder-tier"
                    value={String(selectedTier)}
                    onChange={(e) => setSelectedTier(Number(e.target.value) as StakeholderTier)}
                    options={TIER_OPTIONS}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddStakeholder}
                  disabled={!selectedPartnerId}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  追加
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">案件に関わるパートナーとTierを選択して追加</p>

              {/* 選択済みパートナー一覧 */}
              {(formData.stakeholders?.length ?? 0) > 0 && (
                <div className="mt-3 space-y-2">
                  {(formData.stakeholders || []).map((s) => (
                    <div
                      key={s.partnerId}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {getPartnerName(s.partnerId)}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {getTierLabel(s.tier)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStakeholder(s.partnerId)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500"
                        aria-label={`${getPartnerName(s.partnerId)}を削除`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                        errors={customFieldErrors}
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
