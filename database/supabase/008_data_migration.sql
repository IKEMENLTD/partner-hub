-- =============================================================================
-- Supabase Migration: 008 - Data Migration Scripts
-- Description: 既存データの移行スクリプト
-- =============================================================================

-- =============================================================================
-- 注意事項
-- =============================================================================
-- このファイルは既存Render.comのPostgreSQLからデータを移行するためのテンプレートです。
-- 実際の移行時には、以下の手順で実行してください：
--
-- 1. Render.com からデータをエクスポート（pg_dump または CSV）
-- 2. このスクリプトをカスタマイズ
-- 3. Supabase SQL Editor で実行
-- 4. 検証クエリで確認

-- =============================================================================
-- Step 1: 既存ユーザーデータの移行準備
-- =============================================================================

-- 既存ユーザーを一時テーブルに格納
-- 注: これはRender.comからエクスポートしたデータをインポートする例です

CREATE TEMP TABLE temp_legacy_users (
    id UUID,
    email VARCHAR(255),
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50),
    is_active BOOLEAN,
    department VARCHAR(200),
    position VARCHAR(200),
    phone VARCHAR(50),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- Step 2: ユーザー移行（Supabase Auth + profiles）
-- =============================================================================

-- 重要: Supabase Auth へのユーザー作成は Admin API を使用する必要があります。
-- 以下は profiles テーブルへの直接移行の例です（Auth連携は別途必要）。

-- 例: Supabase Admin API を使用したユーザー作成（Node.js/TypeScript）
/*
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function migrateUsers(legacyUsers) {
  for (const user of legacyUsers) {
    // 1. Supabase Auth にユーザーを作成
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true, // メール確認済みとしてマーク
      user_metadata: {
        first_name: user.first_name,
        last_name: user.last_name,
        display_name: `${user.last_name} ${user.first_name}`
      }
    })

    if (authError) {
      console.error(`Failed to create auth user: ${user.email}`, authError)
      continue
    }

    // 2. profiles テーブルは自動作成されるが、追加フィールドを更新
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: user.role,
        department: user.department,
        position: user.position,
        phone: user.phone,
        is_active: user.is_active
      })
      .eq('id', authUser.user.id)

    if (profileError) {
      console.error(`Failed to update profile: ${user.email}`, profileError)
    }

    // 3. パスワードリセットメールを送信
    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: 'https://your-app.com/reset-password'
    })
  }
}
*/

-- =============================================================================
-- Step 3: パートナーデータの移行
-- =============================================================================

-- 既存の organizations + persons を partners に統合移行

-- 一時テーブル作成
CREATE TEMP TABLE temp_legacy_partners (
    id UUID,
    name VARCHAR(500),
    email VARCHAR(255),
    phone VARCHAR(50),
    company_name VARCHAR(500),
    type VARCHAR(50),
    status VARCHAR(50),
    description TEXT,
    skills TEXT[],
    rating DECIMAL(3,2),
    total_projects INTEGER,
    completed_projects INTEGER,
    address TEXT,
    metadata JSONB,
    user_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE
);

-- マッピング例:
-- PartnerType.INDIVIDUAL → 'individual'
-- PartnerType.COMPANY → 'company'
-- PartnerStatus.PENDING → 'pending'
-- PartnerStatus.ACTIVE → 'active'
-- PartnerStatus.INACTIVE → 'inactive'
-- PartnerStatus.SUSPENDED → 'suspended'

-- パートナー移行INSERT文テンプレート
/*
INSERT INTO public.partners (
    id, name, email, phone, company_name, type, status,
    description, skills, rating, total_projects, completed_projects,
    address, metadata, user_id, created_by, created_at
)
SELECT
    id,
    name,
    email,
    phone,
    company_name,
    type::public.partner_type,
    status::public.partner_status,
    description,
    skills,
    rating,
    total_projects,
    completed_projects,
    address,
    metadata,
    user_id,    -- 新しいSupabase Auth user_id にマッピングが必要
    created_by, -- 新しいSupabase Auth user_id にマッピングが必要
    created_at
FROM temp_legacy_partners;
*/

-- =============================================================================
-- Step 4: プロジェクトデータの移行
-- =============================================================================

-- 一時テーブル作成
CREATE TEMP TABLE temp_legacy_projects (
    id UUID,
    name VARCHAR(500),
    code VARCHAR(100),
    description TEXT,
    project_type VARCHAR(50),
    company_role VARCHAR(50),
    status VARCHAR(50),
    priority VARCHAR(50),
    start_date DATE,
    end_date DATE,
    actual_end_date DATE,
    budget DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    progress INTEGER,
    health_score INTEGER,
    owner_id UUID,
    manager_id UUID,
    template_id UUID,
    tags TEXT[],
    metadata JSONB,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE
);

-- マッピング:
-- ProjectType enum → project_type enum
-- ProjectStatus enum → project_status enum
-- ProjectPriority enum → project_priority enum
-- CompanyRole enum → company_role enum

-- プロジェクト移行INSERT文テンプレート
/*
INSERT INTO public.projects (
    id, name, code, description, project_type, company_role, status, priority,
    start_date, end_date, actual_end_date, budget, actual_cost, progress, health_score,
    owner_id, manager_id, template_id, tags, metadata, created_by, created_at
)
SELECT
    id,
    name,
    code,
    description,
    project_type::public.project_type,
    company_role::public.company_role,
    status::public.project_status,
    priority::public.project_priority,
    start_date,
    end_date,
    actual_end_date,
    budget,
    actual_cost,
    progress,
    health_score,
    owner_id,   -- 新しいSupabase Auth user_id にマッピングが必要
    manager_id, -- 新しいSupabase Auth user_id にマッピングが必要
    template_id,
    tags,
    metadata,
    created_by, -- 新しいSupabase Auth user_id にマッピングが必要
    created_at
FROM temp_legacy_projects;
*/

-- =============================================================================
-- Step 5: タスクデータの移行
-- =============================================================================

-- 一時テーブル作成
CREATE TEMP TABLE temp_legacy_tasks (
    id UUID,
    title VARCHAR(500),
    description TEXT,
    status VARCHAR(50),
    priority VARCHAR(50),
    type VARCHAR(50),
    project_id UUID,
    assignee_id UUID,
    partner_id UUID,
    parent_task_id UUID,
    due_date DATE,
    start_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    progress INTEGER,
    reminder_config JSONB,
    tags TEXT[],
    metadata JSONB,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE
);

-- マッピング:
-- TaskStatus.TODO → 'todo'
-- TaskStatus.IN_PROGRESS → 'in_progress'
-- TaskStatus.REVIEW → 'review'
-- TaskStatus.COMPLETED → 'completed'
-- TaskStatus.CANCELLED → 'cancelled'

-- タスク移行INSERT文テンプレート
/*
INSERT INTO public.tasks (
    id, title, description, status, priority, type,
    project_id, assignee_id, partner_id, parent_task_id,
    due_date, start_date, completed_at, estimated_hours, actual_hours, progress,
    reminder_config, tags, metadata, created_by, created_at
)
SELECT
    id,
    title,
    description,
    status::public.task_status,
    priority::public.task_priority,
    type::public.task_type,
    project_id,
    assignee_id, -- 新しいSupabase Auth user_id にマッピングが必要
    partner_id,
    parent_task_id,
    due_date,
    start_date,
    completed_at,
    estimated_hours,
    actual_hours,
    progress,
    reminder_config,
    tags,
    metadata,
    created_by, -- 新しいSupabase Auth user_id にマッピングが必要
    created_at
FROM temp_legacy_tasks;
*/

-- =============================================================================
-- Step 6: リマインダーデータの移行
-- =============================================================================

-- 一時テーブル作成
CREATE TEMP TABLE temp_legacy_reminders (
    id UUID,
    title VARCHAR(500),
    message TEXT,
    type VARCHAR(50),
    status VARCHAR(50),
    channel VARCHAR(50),
    user_id UUID,
    task_id UUID,
    project_id UUID,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER,
    is_read BOOLEAN,
    metadata JSONB,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE
);

-- リマインダー移行INSERT文テンプレート
/*
INSERT INTO public.reminders (
    id, title, message, type, status, channel,
    user_id, task_id, project_id,
    scheduled_at, sent_at, error_message, retry_count, is_read,
    metadata, created_by, created_at
)
SELECT
    id,
    title,
    message,
    type::public.reminder_type,
    status::public.reminder_status,
    channel::public.reminder_channel,
    user_id,    -- 新しいSupabase Auth user_id にマッピングが必要
    task_id,
    project_id,
    scheduled_at,
    sent_at,
    error_message,
    retry_count,
    is_read,
    metadata,
    created_by, -- 新しいSupabase Auth user_id にマッピングが必要
    created_at
FROM temp_legacy_reminders;
*/

-- =============================================================================
-- Step 7: 検証クエリ
-- =============================================================================

-- 移行後のレコード数確認
/*
SELECT 'profiles' AS table_name, COUNT(*) AS record_count FROM public.profiles
UNION ALL
SELECT 'partners', COUNT(*) FROM public.partners
UNION ALL
SELECT 'projects', COUNT(*) FROM public.projects
UNION ALL
SELECT 'tasks', COUNT(*) FROM public.tasks
UNION ALL
SELECT 'reminders', COUNT(*) FROM public.reminders;
*/

-- 外部キー整合性確認
/*
-- プロジェクトのオーナーが存在するか
SELECT p.id, p.name
FROM public.projects p
LEFT JOIN public.profiles pr ON p.owner_id = pr.id
WHERE pr.id IS NULL;

-- タスクのアサイニーが存在するか
SELECT t.id, t.title
FROM public.tasks t
LEFT JOIN public.profiles pr ON t.assignee_id = pr.id
WHERE t.assignee_id IS NOT NULL AND pr.id IS NULL;
*/

-- =============================================================================
-- ユーザーIDマッピングテーブル（移行時に使用）
-- =============================================================================

-- 旧IDと新ID（Supabase Auth）のマッピングを管理
CREATE TABLE IF NOT EXISTS public._migration_user_mapping (
    legacy_id UUID PRIMARY KEY,
    supabase_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    migrated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE public._migration_user_mapping IS '移行時のユーザーIDマッピング（移行完了後に削除可能）';

-- マッピングを使用した更新例
/*
-- プロジェクトのオーナーIDを更新
UPDATE public.projects p
SET owner_id = m.supabase_id
FROM public._migration_user_mapping m
WHERE p.owner_id = m.legacy_id;

-- タスクのアサイニーIDを更新
UPDATE public.tasks t
SET assignee_id = m.supabase_id
FROM public._migration_user_mapping m
WHERE t.assignee_id = m.legacy_id;
*/
