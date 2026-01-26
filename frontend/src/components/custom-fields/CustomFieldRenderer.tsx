import { Input, Select } from '@/components/common';
import type { CustomFieldDefinition, CustomFieldValue } from '@/types';

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
              />
            )}

            {field.type === 'number' && (
              <Input
                label={`${field.name}${field.required ? ' *' : ''}`}
                type="number"
                value={value !== null ? String(value) : ''}
                onChange={(e) => {
                  const numValue = e.target.value ? Number(e.target.value) : null;
                  handleChange(field, numValue);
                }}
                error={error}
                disabled={disabled}
                placeholder="0"
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
