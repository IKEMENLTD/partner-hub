-- =============================================================================
-- Supabase Seed: Preset Templates
-- Description: 3種類のプリセットテンプレートをproject_templatesテーブルに挿入
-- =============================================================================

-- project_type enum に MAINTENANCE と SUPPORT を追加（存在しない場合）
DO $$
BEGIN
    -- maintenance を追加
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'public.project_type'::regtype
        AND enumlabel = 'maintenance'
    ) THEN
        ALTER TYPE public.project_type ADD VALUE IF NOT EXISTS 'maintenance';
    END IF;

    -- support を追加
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'public.project_type'::regtype
        AND enumlabel = 'support'
    ) THEN
        ALTER TYPE public.project_type ADD VALUE IF NOT EXISTS 'support';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- 既に存在する場合は無視
END $$;

-- =============================================================================
-- テンプレート1: 新規パートナー契約
-- =============================================================================
INSERT INTO public.project_templates (
    name,
    description,
    project_type,
    phases,
    is_active
)
SELECT
    '新規パートナー契約',
    '新規のパートナー企業との契約プロセスを管理するためのテンプレート。初期コンタクトから契約締結までの標準的なワークフローを定義しています。',
    'joint_development'::public.project_type,
    '[
        {
            "name": "初期コンタクト",
            "order": 1,
            "estimatedDays": 3,
            "tasks": [
                { "name": "担当者確認", "order": 1 },
                { "name": "連絡先交換", "order": 2 },
                { "name": "初回ヒアリング", "order": 3 }
            ]
        },
        {
            "name": "契約交渉",
            "order": 2,
            "estimatedDays": 7,
            "tasks": [
                { "name": "条件提示", "order": 1 },
                { "name": "契約書ドラフト", "order": 2 },
                { "name": "法務レビュー", "order": 3 },
                { "name": "修正対応", "order": 4 }
            ]
        },
        {
            "name": "契約締結",
            "order": 3,
            "estimatedDays": 5,
            "tasks": [
                { "name": "最終確認", "order": 1 },
                { "name": "署名手続き", "order": 2 },
                { "name": "システム登録", "order": 3 }
            ]
        }
    ]'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.project_templates WHERE name = '新規パートナー契約'
);

-- 既存の場合は更新
UPDATE public.project_templates
SET
    description = '新規のパートナー企業との契約プロセスを管理するためのテンプレート。初期コンタクトから契約締結までの標準的なワークフローを定義しています。',
    project_type = 'joint_development'::public.project_type,
    phases = '[
        {
            "name": "初期コンタクト",
            "order": 1,
            "estimatedDays": 3,
            "tasks": [
                { "name": "担当者確認", "order": 1 },
                { "name": "連絡先交換", "order": 2 },
                { "name": "初回ヒアリング", "order": 3 }
            ]
        },
        {
            "name": "契約交渉",
            "order": 2,
            "estimatedDays": 7,
            "tasks": [
                { "name": "条件提示", "order": 1 },
                { "name": "契約書ドラフト", "order": 2 },
                { "name": "法務レビュー", "order": 3 },
                { "name": "修正対応", "order": 4 }
            ]
        },
        {
            "name": "契約締結",
            "order": 3,
            "estimatedDays": 5,
            "tasks": [
                { "name": "最終確認", "order": 1 },
                { "name": "署名手続き", "order": 2 },
                { "name": "システム登録", "order": 3 }
            ]
        }
    ]'::jsonb,
    is_active = true,
    updated_at = now()
WHERE name = '新規パートナー契約';

-- =============================================================================
-- テンプレート2: 定期レビュープロセス
-- =============================================================================
INSERT INTO public.project_templates (
    name,
    description,
    project_type,
    phases,
    is_active
)
SELECT
    '定期レビュープロセス',
    'パートナーとの定期レビューミーティングを実施するためのテンプレート。データ収集からフォローアップまでの一連のプロセスを管理します。',
    'consulting'::public.project_type,
    '[
        {
            "name": "準備",
            "order": 1,
            "estimatedDays": 5,
            "tasks": [
                { "name": "データ収集", "order": 1 },
                { "name": "レポート作成", "order": 2 },
                { "name": "関係者調整", "order": 3 }
            ]
        },
        {
            "name": "レビュー実施",
            "order": 2,
            "estimatedDays": 3,
            "tasks": [
                { "name": "ミーティング設定", "order": 1 },
                { "name": "レビュー実施", "order": 2 },
                { "name": "フィードバック収集", "order": 3 }
            ]
        },
        {
            "name": "フォローアップ",
            "order": 3,
            "estimatedDays": 7,
            "tasks": [
                { "name": "アクションアイテム整理", "order": 1 },
                { "name": "改善計画策定", "order": 2 },
                { "name": "次回日程調整", "order": 3 }
            ]
        }
    ]'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.project_templates WHERE name = '定期レビュープロセス'
);

-- 既存の場合は更新
UPDATE public.project_templates
SET
    description = 'パートナーとの定期レビューミーティングを実施するためのテンプレート。データ収集からフォローアップまでの一連のプロセスを管理します。',
    project_type = 'consulting'::public.project_type,
    phases = '[
        {
            "name": "準備",
            "order": 1,
            "estimatedDays": 5,
            "tasks": [
                { "name": "データ収集", "order": 1 },
                { "name": "レポート作成", "order": 2 },
                { "name": "関係者調整", "order": 3 }
            ]
        },
        {
            "name": "レビュー実施",
            "order": 2,
            "estimatedDays": 3,
            "tasks": [
                { "name": "ミーティング設定", "order": 1 },
                { "name": "レビュー実施", "order": 2 },
                { "name": "フィードバック収集", "order": 3 }
            ]
        },
        {
            "name": "フォローアップ",
            "order": 3,
            "estimatedDays": 7,
            "tasks": [
                { "name": "アクションアイテム整理", "order": 1 },
                { "name": "改善計画策定", "order": 2 },
                { "name": "次回日程調整", "order": 3 }
            ]
        }
    ]'::jsonb,
    is_active = true,
    updated_at = now()
WHERE name = '定期レビュープロセス';

-- =============================================================================
-- テンプレート3: 問題対応・エスカレーション
-- =============================================================================
INSERT INTO public.project_templates (
    name,
    description,
    project_type,
    phases,
    is_active
)
SELECT
    '問題対応・エスカレーション',
    'パートナーとの問題発生時のエスカレーションプロセスを管理するためのテンプレート。迅速な問題把握から再発防止策の策定までをカバーします。',
    'other'::public.project_type,
    '[
        {
            "name": "問題把握",
            "order": 1,
            "estimatedDays": 1,
            "tasks": [
                { "name": "状況確認", "order": 1 },
                { "name": "関係者への連絡", "order": 2 },
                { "name": "初期対応", "order": 3 }
            ]
        },
        {
            "name": "原因分析",
            "order": 2,
            "estimatedDays": 3,
            "tasks": [
                { "name": "情報収集", "order": 1 },
                { "name": "原因特定", "order": 2 },
                { "name": "影響範囲確認", "order": 3 }
            ]
        },
        {
            "name": "解決・再発防止",
            "order": 3,
            "estimatedDays": 5,
            "tasks": [
                { "name": "対策実施", "order": 1 },
                { "name": "結果報告", "order": 2 },
                { "name": "再発防止策策定", "order": 3 }
            ]
        }
    ]'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.project_templates WHERE name = '問題対応・エスカレーション'
);

-- 既存の場合は更新
UPDATE public.project_templates
SET
    description = 'パートナーとの問題発生時のエスカレーションプロセスを管理するためのテンプレート。迅速な問題把握から再発防止策の策定までをカバーします。',
    project_type = 'other'::public.project_type,
    phases = '[
        {
            "name": "問題把握",
            "order": 1,
            "estimatedDays": 1,
            "tasks": [
                { "name": "状況確認", "order": 1 },
                { "name": "関係者への連絡", "order": 2 },
                { "name": "初期対応", "order": 3 }
            ]
        },
        {
            "name": "原因分析",
            "order": 2,
            "estimatedDays": 3,
            "tasks": [
                { "name": "情報収集", "order": 1 },
                { "name": "原因特定", "order": 2 },
                { "name": "影響範囲確認", "order": 3 }
            ]
        },
        {
            "name": "解決・再発防止",
            "order": 3,
            "estimatedDays": 5,
            "tasks": [
                { "name": "対策実施", "order": 1 },
                { "name": "結果報告", "order": 2 },
                { "name": "再発防止策策定", "order": 3 }
            ]
        }
    ]'::jsonb,
    is_active = true,
    updated_at = now()
WHERE name = '問題対応・エスカレーション';

-- =============================================================================
-- 挿入結果の確認
-- =============================================================================
DO $$
DECLARE
    template_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count
    FROM public.project_templates
    WHERE name IN ('新規パートナー契約', '定期レビュープロセス', '問題対応・エスカレーション');

    RAISE NOTICE 'Preset templates seeded: % templates', template_count;
END $$;
