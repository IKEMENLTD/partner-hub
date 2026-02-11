-- ============================================================
-- DB Enum検証クエリ (修正版)
-- Supabase SQL Editor で実行してください
-- text にキャストしてenum型チェックエラーを回避
-- ============================================================

-- 1. task_priority の全値を確認
SELECT 'task_priority' AS enum_name, enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE typname = 'task_priority'
ORDER BY enumsortorder;

-- 2. project_priority の全値を確認
SELECT 'project_priority' AS enum_name, enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE typname = 'project_priority'
ORDER BY enumsortorder;

-- 3. 旧 company_role 値を使っているデータがあるか
SELECT 'projects.company_role' AS source, company_role::text AS value, COUNT(*) AS count
FROM projects
WHERE company_role::text IN ('prime', 'subcontractor', 'partner', 'client')
GROUP BY company_role;

-- 4. 旧 project_type 値を使っているデータがあるか
SELECT 'projects.project_type' AS source, project_type::text AS value, COUNT(*) AS count
FROM projects
WHERE project_type::text IN ('joint_development', 'sales_partnership', 'technology_license', 'reseller_agreement', 'consulting')
GROUP BY project_type;

-- 5. urgent priority を使っているタスク/プロジェクトがあるか（textキャストで安全に検索）
SELECT 'tasks' AS source, priority::text AS value, COUNT(*) AS count
FROM tasks WHERE priority::text = 'urgent' GROUP BY priority
UNION ALL
SELECT 'projects' AS source, priority::text AS value, COUNT(*) AS count
FROM projects WHERE priority::text = 'urgent' GROUP BY priority;

-- 6. 現在使われている全priority値の確認
SELECT 'tasks' AS source, priority::text AS value, COUNT(*) AS count
FROM tasks GROUP BY priority
UNION ALL
SELECT 'projects' AS source, priority::text AS value, COUNT(*) AS count
FROM projects GROUP BY priority
ORDER BY source, value;
