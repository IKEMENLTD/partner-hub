import { Select } from '@/components/common';
import { useCustomFieldTemplates } from '@/hooks';
import type { CustomFieldTemplate } from '@/types';

interface CustomFieldTemplateSelectProps {
  value: string | null;
  onChange: (template: CustomFieldTemplate | null) => void;
  disabled?: boolean;
}

export function CustomFieldTemplateSelect({
  value,
  onChange,
  disabled = false,
}: CustomFieldTemplateSelectProps) {
  const { data: templatesData, isLoading } = useCustomFieldTemplates({
    isActive: true,
    sortBy: 'usageCount',
    sortOrder: 'DESC',
    limit: 50,
  });

  const templates = templatesData?.data ?? [];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      onChange(null);
    } else {
      const template = templates.find((t) => t.id === selectedId);
      onChange(template ?? null);
    }
  };

  const options = [
    { value: '', label: 'テンプレートを選択...' },
    ...templates.map((t) => ({
      value: t.id,
      label: `${t.name}${t.usageCount > 0 ? ` (${t.usageCount}回使用)` : ''}`,
    })),
  ];

  return (
    <Select
      label="テンプレートから選択"
      value={value ?? ''}
      onChange={handleChange}
      options={options}
      disabled={disabled || isLoading}
      helperText="過去に保存したフィールド構成を再利用できます"
    />
  );
}
