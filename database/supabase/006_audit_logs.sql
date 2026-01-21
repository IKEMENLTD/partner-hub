-- =============================================================================
-- Supabase Migration: 006 - Audit Logs and Storage
-- Description: 監査ログと添付ファイル管理
-- =============================================================================

-- =============================================================================
-- audit_logs テーブル
-- =============================================================================

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 対象テーブルとレコード
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,

    -- 操作種別
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),

    -- 変更内容
    old_values JSONB,
    new_values JSONB,

    -- 実行者情報
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,

    -- タイムスタンプ
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_by ON public.audit_logs(changed_by);
CREATE INDEX idx_audit_logs_changed_at ON public.audit_logs(changed_at);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

COMMENT ON TABLE public.audit_logs IS '変更履歴（監査ログ）';

-- =============================================================================
-- 監査ログ自動記録トリガー関数
-- =============================================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_values, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 主要テーブルへの監査トリガー設定
-- =============================================================================

-- projects
CREATE TRIGGER audit_projects
    AFTER INSERT OR UPDATE OR DELETE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- tasks
CREATE TRIGGER audit_tasks
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- partners
CREATE TRIGGER audit_partners
    AFTER INSERT OR UPDATE OR DELETE ON public.partners
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: admin のみ閲覧可能
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT USING (public.is_admin());

-- 直接のINSERT/UPDATE/DELETEは禁止（トリガー経由のみ）

-- =============================================================================
-- Supabase Storage バケット設定（SQL参考）
-- 注: Storage バケットは Supabase Dashboard または API で作成する必要があります
-- =============================================================================

-- Storage バケットの作成例（Supabase Dashboard で実行）:
--
-- 1. attachments バケット
--    - Public: false
--    - File size limit: 10MB
--    - Allowed MIME types:
--      - image/*
--      - application/pdf
--      - application/msword
--      - application/vnd.openxmlformats-officedocument.*
--      - text/plain
--      - text/csv

-- Storage RLS ポリシー例:
--
-- -- 認証済みユーザーはアップロード可能
-- CREATE POLICY "attachments_insert" ON storage.objects
--     FOR INSERT TO authenticated
--     WITH CHECK (bucket_id = 'attachments');
--
-- -- 認証済みユーザーは閲覧可能
-- CREATE POLICY "attachments_select" ON storage.objects
--     FOR SELECT TO authenticated
--     USING (bucket_id = 'attachments');
--
-- -- アップロード者は削除可能
-- CREATE POLICY "attachments_delete" ON storage.objects
--     FOR DELETE TO authenticated
--     USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================================
-- attachments テーブル（ファイルメタデータ管理）
-- =============================================================================

CREATE TABLE public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 関連オブジェクト（いずれか1つ）
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

    -- ファイル情報
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,            -- Storage内のパス
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(200),

    -- アップロード者
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- 制約: task_id または project_id のいずれか1つが必須
    CONSTRAINT chk_attachments_parent CHECK (
        (task_id IS NOT NULL AND project_id IS NULL) OR
        (task_id IS NULL AND project_id IS NOT NULL)
    )
);

CREATE INDEX idx_attachments_task_id ON public.attachments(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_attachments_project_id ON public.attachments(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_attachments_uploaded_by ON public.attachments(uploaded_by);

COMMENT ON TABLE public.attachments IS '添付ファイルメタデータ';

-- RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_select_policy" ON public.attachments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "attachments_insert_policy" ON public.attachments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "attachments_delete_policy" ON public.attachments
    FOR DELETE USING (
        uploaded_by = auth.uid()
        OR public.is_admin()
    );
