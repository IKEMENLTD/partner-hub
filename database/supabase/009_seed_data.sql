-- =============================================================================
-- Supabase Migration: 009 - Seed Data
-- Description: 開発・テスト用の初期データ
-- =============================================================================

-- =============================================================================
-- 注意: このスクリプトは開発環境でのみ使用してください
-- 本番環境では実行しないでください
-- =============================================================================

-- =============================================================================
-- テストユーザー作成の注意点
-- =============================================================================
-- Supabase Auth を使用するため、ユーザーは以下の方法で作成します:
--
-- 1. Supabase Dashboard > Authentication > Users から手動作成
-- 2. Admin API を使用してプログラマティックに作成
--
-- profiles テーブルへのデータは auth.users へのINSERTトリガーで自動作成されます。

-- 以下は、手動でユーザーを作成した後に profiles を更新するスクリプトの例です。

-- =============================================================================
-- Step 1: profiles の更新（ユーザー作成後に実行）
-- =============================================================================

-- 管理者ユーザーの更新例
-- UPDATE public.profiles
-- SET
--     role = 'admin',
--     department = '経営管理部',
--     position = '部長',
--     phone = '03-1234-5678'
-- WHERE email = 'admin@example.com';

-- =============================================================================
-- Step 2: パートナーデータ
-- =============================================================================

-- テスト用パートナー企業
INSERT INTO public.partners (
    id, name, email, phone, company_name, type, status,
    description, skills, rating, total_projects, completed_projects
) VALUES
-- 企業パートナー
(
    gen_random_uuid(),
    '山本 健太',
    'yamamoto@techpartners.example.com',
    '03-1111-1111',
    '株式会社テックパートナーズ',
    'company',
    'active',
    'ITソリューション提供企業。クラウド開発に強み。',
    ARRAY['AWS', 'TypeScript', 'React', 'Node.js'],
    4.5,
    10,
    8
),
(
    gen_random_uuid(),
    '伊藤 大輔',
    'ito@cloudsolutions.example.com',
    '03-2222-2222',
    '株式会社クラウドソリューションズ',
    'company',
    'active',
    'クラウドインフラ専門企業',
    ARRAY['AWS', 'GCP', 'Kubernetes', 'Terraform'],
    4.2,
    5,
    5
),
(
    gen_random_uuid(),
    '小林 愛',
    'kobayashi@designworks.example.com',
    '03-3333-3333',
    '合同会社デザインワークス',
    'company',
    'active',
    'UI/UXデザイン専門',
    ARRAY['Figma', 'UI/UX', 'Design System'],
    4.8,
    12,
    11
),
-- 個人事業主パートナー
(
    gen_random_uuid(),
    '加藤 翔',
    'kato@freelance.example.com',
    '090-4444-4444',
    NULL,
    'individual',
    'active',
    'データサイエンティスト。機械学習プロジェクト経験豊富。',
    ARRAY['Python', 'TensorFlow', 'BigQuery', 'データ分析'],
    4.6,
    7,
    6
);

-- =============================================================================
-- Step 3: プロジェクトテンプレート
-- =============================================================================

INSERT INTO public.project_templates (id, name, description, project_type, phases, is_active) VALUES
-- 共同開発テンプレート
(
    gen_random_uuid(),
    '共同開発プロジェクト標準テンプレート',
    '共同開発案件の標準的なフェーズとタスクを定義したテンプレート',
    'joint_development',
    '[
        {
            "name": "企画・要件定義",
            "order": 1,
            "tasks": [
                {"name": "キックオフミーティング", "description": "関係者全員でのキックオフ会議", "estimatedDays": 1, "order": 1},
                {"name": "要件ヒアリング", "description": "関係者から要件をヒアリング", "estimatedDays": 7, "order": 2},
                {"name": "要件定義書作成", "description": "要件定義書の作成", "estimatedDays": 14, "order": 3},
                {"name": "要件定義レビュー", "description": "要件定義書のレビュー会議", "estimatedDays": 3, "order": 4}
            ]
        },
        {
            "name": "設計",
            "order": 2,
            "tasks": [
                {"name": "基本設計", "description": "システム基本設計の作成", "estimatedDays": 21, "order": 1},
                {"name": "詳細設計", "description": "システム詳細設計の作成", "estimatedDays": 21, "order": 2},
                {"name": "設計レビュー", "description": "設計書のレビュー会議", "estimatedDays": 3, "order": 3}
            ]
        },
        {
            "name": "開発",
            "order": 3,
            "tasks": [
                {"name": "環境構築", "description": "開発環境の構築", "estimatedDays": 5, "order": 1},
                {"name": "実装", "description": "機能の実装", "estimatedDays": 60, "order": 2},
                {"name": "単体テスト", "description": "単体テストの実施", "estimatedDays": 14, "order": 3}
            ]
        },
        {
            "name": "テスト",
            "order": 4,
            "tasks": [
                {"name": "結合テスト", "description": "結合テストの実施", "estimatedDays": 14, "order": 1},
                {"name": "システムテスト", "description": "システムテストの実施", "estimatedDays": 14, "order": 2},
                {"name": "受入テスト", "description": "顧客による受入テスト", "estimatedDays": 7, "order": 3}
            ]
        },
        {
            "name": "リリース・運用",
            "order": 5,
            "tasks": [
                {"name": "リリース準備", "description": "本番リリースの準備", "estimatedDays": 5, "order": 1},
                {"name": "リリース実施", "description": "本番環境へのリリース", "estimatedDays": 2, "order": 2},
                {"name": "運用引継ぎ", "description": "運用チームへの引継ぎ", "estimatedDays": 5, "order": 3}
            ]
        }
    ]'::jsonb,
    true
),
-- 販売提携テンプレート
(
    gen_random_uuid(),
    '販売提携テンプレート',
    '販売パートナーとの提携案件用テンプレート',
    'sales_partnership',
    '[
        {
            "name": "提携検討",
            "order": 1,
            "tasks": [
                {"name": "パートナー評価", "description": "パートナー企業の評価", "estimatedDays": 7, "order": 1},
                {"name": "提携条件検討", "description": "提携条件の検討", "estimatedDays": 7, "order": 2}
            ]
        },
        {
            "name": "契約交渉",
            "order": 2,
            "tasks": [
                {"name": "契約書ドラフト作成", "description": "契約書の草案作成", "estimatedDays": 14, "order": 1},
                {"name": "契約交渉", "description": "契約条件の交渉", "estimatedDays": 14, "order": 2},
                {"name": "契約締結", "description": "契約の締結", "estimatedDays": 3, "order": 3}
            ]
        },
        {
            "name": "販売準備",
            "order": 3,
            "tasks": [
                {"name": "販売トレーニング", "description": "販売担当者へのトレーニング", "estimatedDays": 5, "order": 1},
                {"name": "販促資料作成", "description": "販促資料の作成", "estimatedDays": 10, "order": 2}
            ]
        },
        {
            "name": "販売開始・フォロー",
            "order": 4,
            "tasks": [
                {"name": "販売開始", "description": "販売活動の開始", "estimatedDays": 1, "order": 1},
                {"name": "定期フォローアップ", "description": "販売状況の確認とフォロー", "estimatedDays": 30, "order": 2}
            ]
        }
    ]'::jsonb,
    true
);

-- =============================================================================
-- Step 4: サンプルプロジェクト（ユーザー作成後に更新が必要）
-- =============================================================================

-- 注意: owner_id は実際のユーザーIDに置き換える必要があります

-- プロジェクト作成例（owner_id を後で更新）
/*
INSERT INTO public.projects (
    id, name, code, description, project_type, company_role, status, priority,
    start_date, end_date, budget, progress, health_score, tags
) VALUES
(
    gen_random_uuid(),
    '次世代ECプラットフォーム共同開発',
    'PRJ-2026-001',
    'テックパートナーズ社との次世代ECプラットフォーム共同開発プロジェクト',
    'joint_development',
    'prime',
    'in_progress',
    'high',
    '2026-01-15',
    '2026-09-30',
    50000000,
    35,
    85,
    ARRAY['EC', '共同開発', '重要案件']
),
(
    gen_random_uuid(),
    'クラウドセキュリティソリューション販売提携',
    'PRJ-2026-002',
    'セキュリティガード社製品の販売代理店契約',
    'sales_partnership',
    'partner',
    'planning',
    'medium',
    '2026-02-01',
    '2027-01-31',
    10000000,
    10,
    70,
    ARRAY['セキュリティ', '販売提携']
);
*/

-- =============================================================================
-- 開発環境向けクリーンアップスクリプト
-- =============================================================================

-- すべてのテストデータを削除（危険！開発環境のみ）
/*
TRUNCATE public.notification_logs CASCADE;
TRUNCATE public.reminders CASCADE;
TRUNCATE public.task_comments CASCADE;
TRUNCATE public.tasks CASCADE;
TRUNCATE public.attachments CASCADE;
TRUNCATE public.project_stakeholders CASCADE;
TRUNCATE public.project_partners CASCADE;
TRUNCATE public.projects CASCADE;
TRUNCATE public.project_templates CASCADE;
TRUNCATE public.partners CASCADE;
TRUNCATE public.audit_logs CASCADE;
-- profiles は auth.users と連携しているため、auth からユーザーを削除する必要があります
*/
