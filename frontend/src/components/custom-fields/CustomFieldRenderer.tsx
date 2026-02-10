import { Input, Select } from '@/components/common';
import type { CustomFieldDefinition, CustomFieldValue } from '@/types';

/** カスタムフィールドのバリデーション */
export function validateCustomFields(
  fields: CustomFieldDefinition[],
  values: CustomFieldValue[]
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const fieldValue = values.find((v) => v.fieldId === field.id);
    const val = fieldValue?.value;
    const isEmpty = val === null || val === undefined || val === '';

    // 必須チェック
    if (field.required && isEmpty) {
      errors[field.id] = `${field.name}は必須です`;
      continue;
    }

    if (isEmpty) continue;

    // テキストバリデーション
    if (field.type === 'text' && typeof val === 'string') {
      if (field.minLength !== undefined && val.length < field.minLength) {
        errors[field.id] = `${field.minLength}文字以上で入力してください`;
      } else if (field.maxLength !== undefined && val.length > field.maxLength) {
        errors[field.id] = `${field.maxLength}文字以内で入力してください`;
      }
    }

    // 数値バリデーション
    if (field.type === 'number' && typeof val === 'number') {
      if (field.min !== undefined && val < field.min) {
        errors[field.id] = `${field.min}以上の値を入力してください`;
      } else if (field.max !== undefined && val > field.max) {
        errors[field.id] = `${field.max}以下の値を入力してください`;
      }
    }
  }

  return errors;
}

interface CustomFieldRendererProps {
  fields: CustomFieldDefinition[];
  values: CustomFieldValue[];
  onChange: (values: CustomFieldValue[]) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function CustomFieldRenderer({
  fields,
  values,
  onChange,
  errors = {},
  disabled = false,
}: CustomFieldRendererProps) {
  const getValue = (fieldId: string): string | number | null => {
    const fieldValue = values.find((v) => v.fieldId === fieldId);
    return fieldValue?.value ?? null;
  };

  const handleChange = (field: CustomFieldDefinition, value: string | number | null) => {
    const existingIndex = values.findIndex((v) => v.fieldId === field.id);

    const newValue: CustomFieldValue = {
      fieldId: field.id,
      name: field.name,
      type: field.type,
      value,
    };

    if (existingIndex >= 0) {
      const newValues = [...values];
      newValues[existingIndex] = newValue;
      onChange(newValues);
    } else {
      onChange([...values, newValue]);
    }
  };

  if (fields.length === 0) {
    return null;
  }

  // フィールドをorder順にソート
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {sortedFields.map((field) => {
        const value = getValue(field.id);
        const error = errors[field.id];

        return (
          <div key={field.id}>
            {field.type === 'text' && (
              <Input
                label={`${field.name}${field.required ? ' *' : ''}`}
                value={(value as string) ?? ''}
                onChange={(e) => handleChange(field, e.target.value || null)}
                error={error}
                disabled={disabled}
                placeholder={`${field.name}を入力`}
                maxLength={field.maxLength}
                helperText={
                  field.minLength !== undefined && field.maxLength !== undefined
                    ? `${field.minLength}〜${field.maxLength}文字`
                    : field.maxLength !== undefined
                      ? `${field.maxLength}文字以内`
                      : field.minLength !== undefined
                        ? `${field.minLength}文字以上`
                        : undefined
                }
              />
            )}

            {field.type === 'number' && (
              <Input
                label={`${field.name}${field.required ? ' *' : ''}`}
                type="number"
                value={value !== null ? String(value) : ''}
                onChange={(e) => {
                  if (!e.target.value) {
                    handleChange(field, null);
                  } else {
                    const parsed = Number(e.target.value);
                    if (!isNaN(parsed)) handleChange(field, parsed);
                  }
                }}
                error={error}
                disabled={disabled}
                placeholder="0"
                min={field.min}
                max={field.max}
                helperText={
                  field.min !== undefined && field.max !== undefined
                    ? `${field.min}〜${field.max}`
                    : field.max !== undefined
                      ? `${field.max}以下`
                      : field.min !== undefined
                        ? `${field.min}以上`
                        : undefined
                }
              />
            )}

            {field.type === 'date' && (
              <Input
                label={`${field.name}${field.required ? ' *' : ''}`}
                type="date"
                value={(value as string) ?? ''}
                onChange={(e) => handleChange(field, e.target.value || null)}
                error={error}
                disabled={disabled}
              />
            )}

            {field.type === 'select' && (
              <Select
                label={`${field.name}${field.required ? ' *' : ''}`}
                value={(value as string) ?? ''}
                onChange={(e) => handleChange(field, e.target.value || null)}
                options={[
                  { value: '', label: '選択してください' },
                  ...(field.options?.map((opt) => ({ value: opt, label: opt })) ?? []),
                ]}
                error={error}
                disabled={disabled}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
