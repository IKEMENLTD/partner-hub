import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Plus,
  Trash2,
  Settings,
  FileText,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react';
import {
  useCustomFieldTemplates,
  useCreateCustomFieldTemplate,
  useDeleteCustomFieldTemplate,
  useActivateCustomFieldTemplate,
  useDeactivateCustomFieldTemplate,
} from '@/hooks/useCustomFieldTemplates';
import type { CustomFieldType, CustomFieldTemplate } from '@/types';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Modal,
  ModalFooter,
  Input,
  Select,
  TextArea,
  PageLoading,
  ErrorMessage,
  EmptyState,
} from '@/components/common';

// フィールドタイプの選択肢
const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'テキスト' },
  { value: 'number', label: '数値' },
  { value: 'date', label: '日付' },
  { value: 'select', label: '選択肢' },
];

// フィールド定義のフォーム用型
interface FieldFormData {
  name: string;
  type: CustomFieldType;
  required: boolean;
  options: string;
  min: string;
  max: string;
  minLength: string;
  maxLength: string;
}

const defaultFieldData: FieldFormData = {
  name: '',
  type: 'text',
  required: false,
  options: '',
  min: '',
  max: '',
  minLength: '',
  maxLength: '',
};

// テンプレート作成フォーム用型
interface TemplateFormData {
  name: string;
  description: string;
  fields: FieldFormData[];
}

const defaultTemplateFormData: TemplateFormData = {
  name: '',
  description: '',
  fields: [],
};

export function CustomFieldTemplatePage() {
  const { data: templatesData, isLoading, error, refetch } = useCustomFieldTemplates();
  const { mutate: createTemplate, isPending: isCreating } = useCreateCustomFieldTemplate();
  const { mutate: deleteTemplate } = useDeleteCustomFieldTemplate();
  const { mutate: activateTemplate } = useActivateCustomFieldTemplate();
  const { mutate: deactivateTemplate } = useDeactivateCustomFieldTemplate();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>(defaultTemplateFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null);

  const templates = templatesData?.data || [];

  // --- 作成モーダル関連 ---

  const handleOpenCreate = () => {
    setFormData(defaultTemplateFormData);
    setShowCreateModal(true);
  };

  const handleAddField = () => {
    setFormData((prev) => ({
      ...prev,
      fields: [...prev.fields, { ...defaultFieldData }],
    }));
  };

  const handleRemoveField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const handleFieldChange = (index: number, key: keyof FieldFormData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) =>
        i === index ? { ...field, [key]: value } : field
      ),
    }));
  };

  const handleSubmitCreate = () => {
    if (!formData.name.trim() || formData.fields.length === 0) return;

    const fields = formData.fields.map((f, index) => {
      const field: Record<string, unknown> = {
        name: f.name.trim(),
        type: f.type,
        required: f.required,
        order: index,
      };

      if (f.type === 'select' && f.options.trim()) {
        field.options = f.options
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean);
      }

      if (f.type === 'number') {
        if (f.min !== '') field.min = Number(f.min);
        if (f.max !== '') field.max = Number(f.max);
      }

      if (f.type === 'text') {
        if (f.minLength !== '') field.minLength = Number(f.minLength);
        if (f.maxLength !== '') field.maxLength = Number(f.maxLength);
      }

      return field;
    });

    createTemplate(
      {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        fields: fields as never[],
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setFormData(defaultTemplateFormData);
        },
      }
    );
  };

  // --- 削除 ---

  const handleDelete = (id: string) => {
    deleteTemplate(id, {
      onSuccess: () => setDeleteConfirmId(null),
    });
  };

  // --- 無効化 ---

  const handleDeactivate = (id: string) => {
    deactivateTemplate(id, {
      onSuccess: () => setDeactivateConfirmId(null),
    });
  };

  // --- フィールドタイプラベル ---

  const getFieldTypeLabel = (type: CustomFieldType): string => {
    switch (type) {
      case 'text':
        return 'テキスト';
      case 'number':
        return '数値';
      case 'date':
        return '日付';
      case 'select':
        return '選択肢';
      default:
        return type;
    }
  };

  // --- ローディング / エラー ---

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="カスタムフィールドテンプレートの読み込みに失敗しました"
        retry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            カスタムフィールドテンプレート
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            案件に適用するカスタムフィールドのテンプレートを管理します
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={handleOpenCreate}
        >
          テンプレート作成
        </Button>
      </div>

      {/* Template List */}
      {templates.length === 0 ? (
        <Card className="py-12">
          <EmptyState
            icon={<Settings className="h-12 w-12" />}
            title="テンプレートがありません"
            description="カスタムフィールドテンプレートを作成して、案件に共通のフィールド定義を適用しましょう"
            action={
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={handleOpenCreate}
              >
                テンプレート作成
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template: CustomFieldTemplate) => (
            <Card key={template.id} hoverable>
              <CardHeader
                action={
                  <div className="flex items-center gap-1">
                    {template.isActive ? (
                      <button
                        onClick={() => setDeactivateConfirmId(template.id)}
                        className="rounded p-1.5 text-green-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                        title="無効化する"
                      >
                        <ToggleRight className="h-6 w-6" />
                      </button>
                    ) : (
                      <button
                        onClick={() => activateTemplate(template.id)}
                        className="rounded p-1.5 text-gray-400 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                        title="有効化する"
                      >
                        <ToggleLeft className="h-6 w-6" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirmId(template.id)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-red-500"
                      title="削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                }
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  <span className="truncate">{template.name}</span>
                </div>
              </CardHeader>

              <CardContent>
                {/* ステータスバッジ + 使用回数 */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={template.isActive ? 'success' : 'default'} dot>
                    {template.isActive ? '有効' : '無効'}
                  </Badge>
                  <Badge variant="info">
                    使用回数: {template.usageCount}
                  </Badge>
                </div>

                {/* 説明 */}
                {template.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}

                {/* フィールド一覧 */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    フィールド ({template.fields.length})
                  </p>
                  {template.fields
                    .sort((a, b) => a.order - b.order)
                    .map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="truncate">{field.name}</span>
                        <Badge size="sm" variant="default">
                          {getFieldTypeLabel(field.type)}
                        </Badge>
                        {field.required && (
                          <Badge size="sm" variant="warning">
                            必須
                          </Badge>
                        )}
                      </div>
                    ))}
                </div>

                {/* 作成日時 */}
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                  作成日: {format(new Date(template.createdAt), 'yyyy/MM/dd', { locale: ja })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新規テンプレート作成"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="テンプレート名"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            placeholder="例: 補助金案件フィールド"
            required
          />

          <TextArea
            label="説明"
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            placeholder="テンプレートの説明（任意）"
            rows={2}
          />

          {/* フィールド定義 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                フィールド定義
                <span className="ml-1 text-red-500" aria-hidden="true">*</span>
              </label>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={handleAddField}
              >
                フィールド追加
              </Button>
            </div>

            {formData.fields.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center border border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                フィールドを追加してください
              </p>
            )}

            <div className="space-y-3">
              {formData.fields.map((field, index) => (
                <div
                  key={index}
                  className="relative rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-4"
                >
                  {/* 行削除ボタン */}
                  <button
                    type="button"
                    onClick={() => handleRemoveField(index)}
                    className="absolute top-2 right-2 rounded p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-red-500"
                    title="このフィールドを削除"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-8">
                    {/* フィールド名 */}
                    <Input
                      label="フィールド名"
                      value={field.name}
                      onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                      placeholder="例: 予算区分"
                      required
                    />

                    {/* タイプ */}
                    <Select
                      label="タイプ"
                      value={field.type}
                      onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                      options={FIELD_TYPE_OPTIONS}
                    />

                    {/* 必須チェックボックス */}
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                          className="rounded border-gray-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500 h-4 w-4"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">必須</span>
                      </label>
                    </div>
                  </div>

                  {/* 条件付きオプション: select タイプ */}
                  {field.type === 'select' && (
                    <div className="mt-3">
                      <Input
                        label="選択肢（カンマ区切り）"
                        value={field.options}
                        onChange={(e) => handleFieldChange(index, 'options', e.target.value)}
                        placeholder="例: 選択肢A, 選択肢B, 選択肢C"
                      />
                    </div>
                  )}

                  {/* 条件付きオプション: number タイプ */}
                  {field.type === 'number' && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Input
                        label="最小値"
                        type="number"
                        value={field.min}
                        onChange={(e) => handleFieldChange(index, 'min', e.target.value)}
                        placeholder="例: 0"
                      />
                      <Input
                        label="最大値"
                        type="number"
                        value={field.max}
                        onChange={(e) => handleFieldChange(index, 'max', e.target.value)}
                        placeholder="例: 100"
                      />
                    </div>
                  )}

                  {/* 条件付きオプション: text タイプ */}
                  {field.type === 'text' && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Input
                        label="最小文字数"
                        type="number"
                        value={field.minLength}
                        onChange={(e) => handleFieldChange(index, 'minLength', e.target.value)}
                        placeholder="例: 1"
                      />
                      <Input
                        label="最大文字数"
                        type="number"
                        value={field.maxLength}
                        onChange={(e) => handleFieldChange(index, 'maxLength', e.target.value)}
                        placeholder="例: 255"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleSubmitCreate}
            isLoading={isCreating}
            disabled={!formData.name.trim() || formData.fields.length === 0 || formData.fields.some((f) => !f.name.trim())}
          >
            作成
          </Button>
        </ModalFooter>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={!!deactivateConfirmId}
        onClose={() => setDeactivateConfirmId(null)}
        title="テンプレートの無効化"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            このテンプレートを無効化しますか？無効化すると新しい案件への適用ができなくなります。
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeactivateConfirmId(null)}>
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={() => deactivateConfirmId && handleDeactivate(deactivateConfirmId)}
            >
              無効化
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="テンプレートの削除"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            このテンプレートを削除しますか？この操作は取り消せません。
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              削除
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
