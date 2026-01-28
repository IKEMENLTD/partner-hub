-- カスタムフィールドテンプレートテーブル
CREATE TABLE IF NOT EXISTS custom_field_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_custom_field_templates_organization ON custom_field_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_templates_active ON custom_field_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_field_templates_created_by ON custom_field_templates(created_by);

-- 更新日時トリガー
CREATE OR REPLACE FUNCTION update_custom_field_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_custom_field_templates_updated_at ON custom_field_templates;
CREATE TRIGGER trigger_update_custom_field_templates_updated_at
    BEFORE UPDATE ON custom_field_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_field_templates_updated_at();

-- RLSポリシー
ALTER TABLE custom_field_templates ENABLE ROW LEVEL SECURITY;

-- 同一組織のメンバーのみ閲覧可能
CREATE POLICY "Users can view templates in their organization"
    ON custom_field_templates FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 作成は同一組織のメンバーのみ
CREATE POLICY "Users can create templates in their organization"
    ON custom_field_templates FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 更新は作成者またはadmin/managerのみ
CREATE POLICY "Users can update their own templates or admins"
    ON custom_field_templates FOR UPDATE
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND organization_id = custom_field_templates.organization_id
            AND role IN ('admin', 'manager')
        )
    );

-- 削除は作成者またはadmin/managerのみ
CREATE POLICY "Users can delete their own templates or admins"
    ON custom_field_templates FOR DELETE
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND organization_id = custom_field_templates.organization_id
            AND role IN ('admin', 'manager')
        )
    );
