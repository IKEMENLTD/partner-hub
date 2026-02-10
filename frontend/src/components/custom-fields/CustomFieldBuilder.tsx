import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button, Input, Select } from '@/components/common';
import type { CustomFieldDefinition, CustomFieldType } from '@/types';

// シンプルなユニークID生成関数
const generateId = (): string => {
  return `cf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

interface CustomFieldBuilderProps {
  fields: CustomFieldDefinition[];
  onChange: (fields: CustomFieldDefinition[]) => void;
  maxFields?: number;
}

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'テキスト' },
  { value: 'number', label: '数値' },
  { value: 'date', label: '日付' },
  { value: 'select', label: '選択肢' },
];

export function CustomFieldBuilder({
  fields,
  onChange,
  maxFields = 20,
}: CustomFieldBuilderProps) {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [editingOptions, setEditingOptions] = useState<string | null>(null);
  const [optionInput, setOptionInput] = useState('');

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    if (fields.length >= maxFields) return;

    const newField: CustomFieldDefinition = {
      id: generateId(),
      name: newFieldName.trim(),
      type: newFieldType,
      required: false,
      order: fields.length,
      options: newFieldType === 'select' ? [] : undefined,
    };

    onChange([...fields, newField]);
    setNewFieldName('');
    setNewFieldType('text');
  };

  const handleRemoveField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  const handleUpdateField = (id: string, updates: Partial<CustomFieldDefinition>) => {
    onChange(
      fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleAddOption = (fieldId: string) => {
    if (!optionInput.trim()) return;
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    const newOptions = [...(field.options || []), optionInput.trim()];
    handleUpdateField(fieldId, { options: newOptions });
    setOptionInput('');
  };

  const handleRemoveOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    const newOptions = field.options?.filter((_, i) => i !== optionIndex);
    handleUpdateField(fieldId, { options: newOptions });
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    // order を更新
    newFields.forEach((f, i) => (f.order = i));
    onChange(newFields);
  };

  return (
    <div className="space-y-4">
      {/* 既存フィールド一覧 */}
      {fields.length > 0 && (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
            >
              {/* ドラッグハンドル（将来的にドラッグ&ドロップ対応時に使用） */}
              <div className="flex flex-col gap-1 pt-2">
                <button
                  type="button"
                  onClick={() => handleMoveField(index, 'up')}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  aria-label="上に移動"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-2">
                <div className="grid-form items-center">
                  {/* フィールド名 */}
                  <Input
                    value={field.name}
                    onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                    placeholder="フィールド名"
                    className="col-span-full sm:col-span-1"
                  />

                  {/* フィールドタイプ */}
                  <Select
                    value={field.type}
                    onChange={(e) => {
                      const newType = e.target.value as CustomFieldType;
                      handleUpdateField(field.id, {
                        type: newType,
                        options: newType === 'select' ? [] : undefined,
                      });
                    }}
                    options={FIELD_TYPE_OPTIONS}
                    className="w-full sm:w-32"
                  />

                  {/* 必須チェック & 削除ボタン */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      必須
                    </label>

                    {/* 削除ボタン */}
                    <button
                      type="button"
                      onClick={() => handleRemoveField(field.id)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500"
                      aria-label="フィールドを削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* バリデーションルール（テキスト） */}
                {field.type === 'text' && (
                  <div className="flex items-center gap-3 ml-4">
                    <Input
                      type="number"
                      value={field.minLength !== undefined ? String(field.minLength) : ''}
                      onChange={(e) => handleUpdateField(field.id, { minLength: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="最小文字数"
                      className="w-28"
                    />
                    <span className="text-sm text-gray-500">〜</span>
                    <Input
                      type="number"
                      value={field.maxLength !== undefined ? String(field.maxLength) : ''}
                      onChange={(e) => handleUpdateField(field.id, { maxLength: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="最大文字数"
                      className="w-28"
                    />
                    <span className="text-xs text-gray-400">文字</span>
                  </div>
                )}

                {/* バリデーションルール（数値） */}
                {field.type === 'number' && (
                  <div className="flex items-center gap-3 ml-4">
                    <Input
                      type="number"
                      value={field.min !== undefined ? String(field.min) : ''}
                      onChange={(e) => handleUpdateField(field.id, { min: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="最小値"
                      className="w-28"
                    />
                    <span className="text-sm text-gray-500">〜</span>
                    <Input
                      type="number"
                      value={field.max !== undefined ? String(field.max) : ''}
                      onChange={(e) => handleUpdateField(field.id, { max: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="最大値"
                      className="w-28"
                    />
                  </div>
                )}

                {/* 選択肢の編集（selectタイプの場合） */}
                {field.type === 'select' && (
                  <div className="ml-4 space-y-2">
                    <div className="text-sm text-gray-500">選択肢:</div>
                    <div className="flex flex-wrap gap-2">
                      {field.options?.map((option, optIndex) => (
                        <span
                          key={optIndex}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm border"
                        >
                          {option}
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(field.id, optIndex)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={editingOptions === field.id ? optionInput : ''}
                        onChange={(e) => {
                          setEditingOptions(field.id);
                          setOptionInput(e.target.value);
                        }}
                        onFocus={() => {
                          if (editingOptions !== field.id) {
                            setOptionInput('');
                            setEditingOptions(field.id);
                          }
                        }}
                        placeholder="選択肢を追加"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddOption(field.id);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddOption(field.id)}
                        disabled={!optionInput.trim() || editingOptions !== field.id}
                      >
                        追加
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新規フィールド追加 */}
      {fields.length < maxFields && (
        <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-gray-200 p-3">
          <Input
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="新しいフィールド名"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddField();
              }
            }}
          />
          <Select
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
            options={FIELD_TYPE_OPTIONS}
            className="w-32"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddField}
            disabled={!newFieldName.trim()}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            追加
          </Button>
        </div>
      )}

      {fields.length >= maxFields && (
        <p className="text-sm text-gray-500">
          フィールド数の上限（{maxFields}個）に達しました
        </p>
      )}
    </div>
  );
}
