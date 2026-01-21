-- =============================================================================
-- Supabase Migration: 005 - Reminders and Notifications
-- Description: リマインダーと通知テーブル
-- =============================================================================

-- =============================================================================
-- ENUM型定義
-- =============================================================================

-- リマインダー種別
CREATE TYPE public.reminder_type AS ENUM (
    'due_date',             -- 期限リマインダー
    'follow_up',            -- フォローアップ
    'status_change',        -- ステータス変更通知
    'custom'                -- カスタム
);

-- リマインダーステータス
CREATE TYPE public.reminder_status AS ENUM (
    'pending',              -- 送信待ち
    'sent',                 -- 送信済み
    'delivered',            -- 配信済み
    'failed',               -- 失敗
    'cancelled'             -- キャンセル
);

-- 通知チャネル
CREATE TYPE public.reminder_channel AS ENUM (
    'email',                -- メール
    'in_app',               -- アプリ内通知
    'slack',                -- Slack
    'teams',                -- Microsoft Teams
    'webhook'               -- Webhook
);

-- =============================================================================
-- reminders テーブル
-- =============================================================================

CREATE TABLE public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 基本情報
    title VARCHAR(500) NOT NULL,
    message TEXT,

    -- 種別とステータス
    type public.reminder_type NOT NULL DEFAULT 'custom',
    status public.reminder_status NOT NULL DEFAULT 'pending',
    channel public.reminder_channel NOT NULL DEFAULT 'in_app',

    -- 対象ユーザー
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- 関連オブジェクト
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

    -- スケジュール
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,

    -- エラー情報
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- 既読フラグ（in_app通知用）
    is_read BOOLEAN NOT NULL DEFAULT false,

    -- メタデータ
    metadata JSONB DEFAULT '{}',

    -- 作成者
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX idx_reminders_task_id ON public.reminders(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_reminders_project_id ON public.reminders(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_reminders_status ON public.reminders(status);
CREATE INDEX idx_reminders_scheduled_at ON public.reminders(scheduled_at);
CREATE INDEX idx_reminders_is_read ON public.reminders(is_read) WHERE is_read = false;

-- 送信待ちリマインダー検索用
CREATE INDEX idx_reminders_pending ON public.reminders(scheduled_at)
    WHERE status = 'pending';

COMMENT ON TABLE public.reminders IS 'リマインダー・通知情報';

CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- notification_logs テーブル（通知送信履歴）
-- =============================================================================

CREATE TABLE public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 関連オブジェクト
    reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

    -- 受信者情報
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255),

    -- 送信情報
    channel public.reminder_channel NOT NULL,
    status public.reminder_status NOT NULL DEFAULT 'pending',

    -- 内容
    subject VARCHAR(1000),
    message TEXT,

    -- 結果
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,

    -- メタデータ
    metadata JSONB DEFAULT '{}',

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_notification_logs_reminder_id ON public.notification_logs(reminder_id);
CREATE INDEX idx_notification_logs_task_id ON public.notification_logs(task_id);
CREATE INDEX idx_notification_logs_project_id ON public.notification_logs(project_id);
CREATE INDEX idx_notification_logs_recipient_id ON public.notification_logs(recipient_id);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX idx_notification_logs_channel ON public.notification_logs(channel);
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at);

COMMENT ON TABLE public.notification_logs IS '通知送信履歴';

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

-- reminders
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分宛のリマインダーのみ閲覧可能
CREATE POLICY "reminders_select_own_policy" ON public.reminders
    FOR SELECT USING (user_id = auth.uid());

-- SELECT: admin は全リマインダーを閲覧可能
CREATE POLICY "reminders_select_admin_policy" ON public.reminders
    FOR SELECT USING (public.is_admin());

-- INSERT: 認証済みユーザーはリマインダーを作成可能
CREATE POLICY "reminders_insert_policy" ON public.reminders
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: 作成者または対象ユーザーが更新可能
CREATE POLICY "reminders_update_policy" ON public.reminders
    FOR UPDATE USING (
        user_id = auth.uid()
        OR created_by = auth.uid()
        OR public.is_admin()
    );

-- DELETE: 作成者または admin が削除可能
CREATE POLICY "reminders_delete_policy" ON public.reminders
    FOR DELETE USING (
        created_by = auth.uid()
        OR public.is_admin()
    );

-- notification_logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分宛の通知ログのみ閲覧可能
CREATE POLICY "notification_logs_select_own_policy" ON public.notification_logs
    FOR SELECT USING (recipient_id = auth.uid());

-- SELECT: admin は全通知ログを閲覧可能
CREATE POLICY "notification_logs_select_admin_policy" ON public.notification_logs
    FOR SELECT USING (public.is_admin());

-- INSERT: service_role のみ（バックエンドから）
-- 通常のユーザーは直接INSERTしない

-- =============================================================================
-- ヘルパー関数: 未読通知数を取得
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
BEGIN
    SELECT COUNT(*) INTO count
    FROM public.reminders
    WHERE user_id = auth.uid()
      AND channel = 'in_app'
      AND is_read = false;

    RETURN COALESCE(count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
