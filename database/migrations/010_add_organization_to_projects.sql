-- 案件テーブルに組織IDを追加
-- これにより、案件が会社ごとに分離される

-- organization_id カラムを追加
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_projects_organization_id
ON projects(organization_id);

-- 既存の案件に対して、作成者の組織IDを設定
UPDATE projects p
SET organization_id = pr.organization_id
FROM profiles pr
WHERE p.created_by = pr.id
  AND p.organization_id IS NULL
  AND pr.organization_id IS NOT NULL;
