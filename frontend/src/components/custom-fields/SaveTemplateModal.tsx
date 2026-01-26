import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button, Input, TextArea, Modal } from '@/components/common';
import { useCreateCustomFieldTemplate } from '@/hooks';
import type { CustomFieldDefinition } from '@/types';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  fields: CustomFieldDefinition[];
  onSaved?: () => void;
}

export function SaveTemplateModal({
  isOpen,
  onClose,
  fields,
  onSaved,
}: SaveTemplateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { mutate: createTemplate, isPending } = useCreateCustomFieldTemplate();

  const handleSave = () => {
    if (!name.trim()) return;

    createTemplate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        fields: fields.map((f) => ({
          name: f.name,
          type: f.type,
          required: f.required,
          order: f.order,
          options: f.options,
        })),
      },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          onSaved?.();
          onClose();
        },
      }
    );
  };

  const handleSkip = () => {
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSkip}
      title="フィールド構成をテンプレートとして保存"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          このカスタムフィールドの構成をテンプレートとして保存すると、
          次回以降の案件作成時に再利用できます。
        </p>

        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-sm font-medium text-gray-700 mb-2">
            保存するフィールド ({fields.length}個)
          </div>
          <div className="flex flex-wrap gap-2">
            {fields.map((field) => (
              <span
                key={field.id}
                className="inline-flex items-center rounded-full bg-white px-3 py-1 text-sm border"
              >
                {field.name}
                <span className="ml-1 text-gray-400 text-xs">
                  ({field.type === 'text' ? 'テキスト' :
                    field.type === 'number' ? '数値' :
                    field.type === 'date' ? '日付' : '選択肢'})
                </span>
              </span>
            ))}
          </div>
        </div>

        <Input
          label="テンプレート名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 補助金案件フィールド"
          required
        />

        <TextArea
          label="説明（任意）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="このテンプレートの用途など"
          rows={2}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={isPending}
          >
            保存しない
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || isPending}
            isLoading={isPending}
            leftIcon={<Save className="h-4 w-4" />}
          >
            テンプレートを保存
          </Button>
        </div>
      </div>
    </Modal>
  );
}
