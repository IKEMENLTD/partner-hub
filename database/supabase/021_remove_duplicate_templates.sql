-- =============================================================================
-- Migration 021: Remove duplicate project templates
-- Description: 同名テンプレートが複数存在する場合、古い方を残して新しい方を削除
-- =============================================================================

-- 重複テンプレートを削除（同名のうちcreated_atが新しい方を削除）
DELETE FROM project_templates a
USING project_templates b
WHERE a.name = b.name
  AND a.id != b.id
  AND a.created_at > b.created_at;

-- 今後の重複を防止するためにユニーク制約を追加
ALTER TABLE project_templates
  ADD CONSTRAINT project_templates_name_unique UNIQUE (name);
