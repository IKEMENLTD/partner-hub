-- カスタムフィールドテンプレートに組織IDを追加
-- これにより、テンプレートが会社ごとに分離される

-- organization_id カラムを追加
ALTER TABLE custom_field_templates
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_custom_field_templates_organization_id
ON custom_field_templates(organization_id);

-- 既存のテンプレートに対して、作成者の組織IDを設定
UPDATE custom_field_templates t
SET organization_id = p.organization_id
FROM profiles p
WHERE t.created_by = p.id
  AND t.organization_id IS NULL
  AND p.organization_id IS NOT NULL;
