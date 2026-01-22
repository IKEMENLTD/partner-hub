-- =============================================================================
-- Seed Data: Business Templates
-- Description: 3種類のビジネステンプレート（補助金営業、ASP案件、開発案件）
-- Created: 2026-01-22
-- =============================================================================

BEGIN;

-- =============================================================================
-- project_type enum 拡張（必要な場合）
-- =============================================================================
DO $$
BEGIN
    -- subsidy を追加（存在しない場合）
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'public.project_type'::regtype
        AND enumlabel = 'subsidy'
    ) THEN
        ALTER TYPE public.project_type ADD VALUE IF NOT EXISTS 'subsidy';
    END IF;

    -- asp を追加（存在しない場合）
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'public.project_type'::regtype
        AND enumlabel = 'asp'
    ) THEN
        ALTER TYPE public.project_type ADD VALUE IF NOT EXISTS 'asp';
    END IF;

    -- development を追加（存在しない場合）
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'public.project_type'::regtype
        AND enumlabel = 'development'
    ) THEN
        ALTER TYPE public.project_type ADD VALUE IF NOT EXISTS 'development';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- 既に存在する場合は無視
END $$;

-- =============================================================================
-- テンプレート1: 補助金営業テンプレート (SUBSIDY_CONSULTING)
-- =============================================================================
INSERT INTO public.project_templates (
    name,
    description,
    project_type,
    phases,
    is_active
)
SELECT
    '補助金営業テンプレート',
    '補助金申請支援プロジェクトの標準テンプレート。ヒアリングから申請フォローまでの一連のプロセスを管理します。',
    'consulting'::public.project_type,
    '[
        {
            "name": "ヒアリング・企画",
            "order": 1,
            "estimatedDays": 7,
            "tasks": [
                {
                    "name": "初回ヒアリング",
                    "description": "クライアントの事業内容、課題、目標をヒアリング",
                    "estimatedDays": 1,
                    "order": 1
                },
                {
                    "name": "補助金制度の選定",
                    "description": "適切な補助金制度を調査・選定",
                    "estimatedDays": 2,
                    "order": 2
                },
                {
                    "name": "企画書作成",
                    "description": "申請内容の企画書を作成",
                    "estimatedDays": 3,
                    "order": 3
                },
                {
                    "name": "クライアント承認",
                    "description": "企画内容の承認を得る",
                    "estimatedDays": 1,
                    "order": 4
                }
            ]
        },
        {
            "name": "申請書作成",
            "order": 2,
            "estimatedDays": 14,
            "tasks": [
                {
                    "name": "事業計画書作成",
                    "description": "補助金申請用の事業計画書を作成",
                    "estimatedDays": 7,
                    "order": 1
                },
                {
                    "name": "必要書類の収集",
                    "description": "登記簿謄本、決算書など必要書類を収集",
                    "estimatedDays": 3,
                    "order": 2
                },
                {
                    "name": "申請書類のレビュー",
                    "description": "作成した申請書類の内容確認",
                    "estimatedDays": 2,
                    "order": 3
                },
                {
                    "name": "最終確認・修正",
                    "description": "クライアントと最終確認",
                    "estimatedDays": 2,
                    "order": 4
                }
            ]
        },
        {
            "name": "申請・フォロー",
            "order": 3,
            "estimatedDays": 7,
            "tasks": [
                {
                    "name": "補助金申請",
                    "description": "電子申請システムから申請",
                    "estimatedDays": 1,
                    "order": 1
                },
                {
                    "name": "審査状況確認",
                    "description": "定期的に審査状況を確認",
                    "estimatedDays": 3,
                    "order": 2
                },
                {
                    "name": "追加資料対応",
                    "description": "必要に応じて追加資料を提出",
                    "estimatedDays": 2,
                    "order": 3
                },
                {
                    "name": "結果報告",
                    "description": "クライアントへ結果を報告",
                    "estimatedDays": 1,
                    "order": 4
                }
            ]
        }
    ]'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.project_templates WHERE name = '補助金営業テンプレート'
);

-- 既存の場合は更新
UPDATE public.project_templates
SET
    description = '補助金申請支援プロジェクトの標準テンプレート。ヒアリングから申請フォローまでの一連のプロセスを管理します。',
    project_type = 'consulting'::public.project_type,
    phases = '[
        {
            "name": "ヒアリング・企画",
            "order": 1,
            "estimatedDays": 7,
            "tasks": [
                {
                    "name": "初回ヒアリング",
                    "description": "クライアントの事業内容、課題、目標をヒアリング",
                    "estimatedDays": 1,
                    "order": 1
                },
                {
                    "name": "補助金制度の選定",
                    "description": "適切な補助金制度を調査・選定",
                    "estimatedDays": 2,
                    "order": 2
                },
                {
                    "name": "企画書作成",
                    "description": "申請内容の企画書を作成",
                    "estimatedDays": 3,
                    "order": 3
                },
                {
                    "name": "クライアント承認",
                    "description": "企画内容の承認を得る",
                    "estimatedDays": 1,
                    "order": 4
                }
            ]
        },
        {
            "name": "申請書作成",
            "order": 2,
            "estimatedDays": 14,
            "tasks": [
                {
                    "name": "事業計画書作成",
                    "description": "補助金申請用の事業計画書を作成",
                    "estimatedDays": 7,
                    "order": 1
                },
                {
                    "name": "必要書類の収集",
                    "description": "登記簿謄本、決算書など必要書類を収集",
                    "estimatedDays": 3,
                    "order": 2
                },
                {
                    "name": "申請書類のレビュー",
                    "description": "作成した申請書類の内容確認",
                    "estimatedDays": 2,
                    "order": 3
                },
                {
                    "name": "最終確認・修正",
                    "description": "クライアントと最終確認",
                    "estimatedDays": 2,
                    "order": 4
                }
            ]
        },
        {
            "name": "申請・フォロー",
            "order": 3,
            "estimatedDays": 7,
            "tasks": [
                {
                    "name": "補助金申請",
                    "description": "電子申請システムから申請",
                    "estimatedDays": 1,
                    "order": 1
                },
                {
                    "name": "審査状況確認",
                    "description": "定期的に審査状況を確認",
                    "estimatedDays": 3,
                    "order": 2
                },
                {
                    "name": "追加資料対応",
                    "description": "必要に応じて追加資料を提出",
                    "estimatedDays": 2,
                    "order": 3
                },
                {
                    "name": "結果報告",
                    "description": "クライアントへ結果を報告",
                    "estimatedDays": 1,
                    "order": 4
                }
            ]
        }
    ]'::jsonb,
    is_active = true,
    updated_at = now()
WHERE name = '補助金営業テンプレート';

-- =============================================================================
-- テンプレート2: ASP案件テンプレート (ASP_SERVICE)
-- =============================================================================
INSERT INTO public.project_templates (
    name,
    description,
    project_type,
    phases,
    is_active
)
SELECT
    'ASP案件テンプレート',
    'ASP/SaaSサービス提供プロジェクトの標準テンプレート。要件定義から本番導入までの一連のプロセスを管理します。',
    'other'::public.project_type,
    '[
        {
            "name": "要件定義",
            "order": 1,
            "estimatedDays": 10,
            "tasks": [
                {
                    "name": "キックオフミーティング",
                    "description": "プロジェクトの目的、スコープ、スケジュールを確認",
                    "estimatedDays": 1,
                    "order": 1
                },
                {
                    "name": "現状分析",
                    "description": "クライアントの現在のシステム・業務フローを分析",
                    "estimatedDays": 3,
                    "order": 2
                },
                {
                    "name": "要件定義書作成",
                    "description": "機能要件・非機能要件を整理",
                    "estimatedDays": 4,
                    "order": 3
                },
                {
                    "name": "要件承認",
                    "description": "クライアントからの要件承認",
                    "estimatedDays": 2,
                    "order": 4
                }
            ]
        },
        {
            "name": "設定・カスタマイズ",
            "order": 2,
            "estimatedDays": 14,
            "tasks": [
                {
                    "name": "アカウント設定",
                    "description": "ユーザーアカウント、権限設定",
                    "estimatedDays": 2,
                    "order": 1
                },
                {
                    "name": "マスタデータ登録",
                    "description": "商品、顧客などのマスタデータを登録",
                    "estimatedDays": 3,
                    "order": 2
                },
                {
                    "name": "カスタマイズ開発",
                    "description": "必要なカスタマイズ機能の開発",
                    "estimatedDays": 7,
                    "order": 3
                },
                {
                    "name": "動作確認",
                    "description": "カスタマイズ内容の動作確認",
                    "estimatedDays": 2,
                    "order": 4
                }
            ]
        },
        {
            "name": "テスト・導入",
            "order": 3,
            "estimatedDays": 7,
            "tasks": [
                {
                    "name": "UAT実施",
                    "description": "ユーザー受け入れテストの実施",
                    "estimatedDays": 3,
                    "order": 1
                },
                {
                    "name": "データ移行",
                    "description": "既存システムからのデータ移行",
                    "estimatedDays": 2,
                    "order": 2
                },
                {
                    "name": "本番リリース",
                    "description": "本番環境へのリリース",
                    "estimatedDays": 1,
                    "order": 3
                },
                {
                    "name": "運用サポート",
                    "description": "リリース後の初期サポート",
                    "estimatedDays": 1,
                    "order": 4
                }
            ]
        }
    ]'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.project_templates WHERE name = 'ASP案件テンプレート'
);

-- 既存の場合は更新
UPDATE public.project_templates
SET
    description = 'ASP/SaaSサービス提供プロジェクトの標準テンプレート。要件定義から本番導入までの一連のプロセスを管理します。',
    project_type = 'other'::public.project_type,
    phases = '[
        {
            "name": "要件定義",
            "order": 1,
            "estimatedDays": 10,
            "tasks": [
                {
                    "name": "キックオフミーティング",
                    "description": "プロジェクトの目的、スコープ、スケジュールを確認",
                    "estimatedDays": 1,
                    "order": 1
                },
                {
                    "name": "現状分析",
                    "description": "クライアントの現在のシステム・業務フローを分析",
                    "estimatedDays": 3,
                    "order": 2
                },
                {
                    "name": "要件定義書作成",
                    "description": "機能要件・非機能要件を整理",
                    "estimatedDays": 4,
                    "order": 3
                },
                {
                    "name": "要件承認",
                    "description": "クライアントからの要件承認",
                    "estimatedDays": 2,
                    "order": 4
                }
            ]
        },
        {
            "name": "設定・カスタマイズ",
            "order": 2,
            "estimatedDays": 14,
            "tasks": [
                {
                    "name": "アカウント設定",
                    "description": "ユーザーアカウント、権限設定",
                    "estimatedDays": 2,
                    "order": 1
                },
                {
                    "name": "マスタデータ登録",
                    "description": "商品、顧客などのマスタデータを登録",
                    "estimatedDays": 3,
                    "order": 2
                },
                {
                    "name": "カスタマイズ開発",
                    "description": "必要なカスタマイズ機能の開発",
                    "estimatedDays": 7,
                    "order": 3
                },
                {
                    "name": "動作確認",
                    "description": "カスタマイズ内容の動作確認",
                    "estimatedDays": 2,
                    "order": 4
                }
            ]
        },
        {
            "name": "テスト・導入",
            "order": 3,
            "estimatedDays": 7,
            "tasks": [
                {
                    "name": "UAT実施",
                    "description": "ユーザー受け入れテストの実施",
                    "estimatedDays": 3,
                    "order": 1
                },
                {
                    "name": "データ移行",
                    "description": "既存システムからのデータ移行",
                    "estimatedDays": 2,
                    "order": 2
                },
                {
                    "name": "本番リリース",
                    "description": "本番環境へのリリース",
                    "estimatedDays": 1,
                    "order": 3
                },
                {
                    "name": "運用サポート",
                    "description": "リリース後の初期サポート",
                    "estimatedDays": 1,
                    "order": 4
                }
            ]
        }
    ]'::jsonb,
    is_active = true,
    updated_at = now()
WHERE name = 'ASP案件テンプレート';

-- =============================================================================
-- テンプレート3: 開発案件テンプレート (CUSTOM_DEVELOPMENT)
-- =============================================================================
INSERT INTO public.project_templates (
    name,
    description,
    project_type,
    phases,
    is_active
)
SELECT
    '開発案件テンプレート',
    'カスタム開発プロジェクトの標準テンプレート。要件定義から本番リリースまでの開発プロセスを管理します。',
    'joint_development'::public.project_type,
    '[
        {
            "name": "要件定義・設計",
            "order": 1,
            "estimatedDays": 14,
            "tasks": [
                {
                    "name": "キックオフ",
                    "description": "プロジェクトキックオフミーティング",
                    "estimatedDays": 1,
                    "order": 1
                },
                {
                    "name": "要件定義",
                    "description": "機能要件・非機能要件の詳細化",
                    "estimatedDays": 5,
                    "order": 2
                },
                {
                    "name": "基本設計",
                    "description": "システムアーキテクチャ、画面設計",
                    "estimatedDays": 5,
                    "order": 3
                },
                {
                    "name": "詳細設計",
                    "description": "データベース設計、API設計",
                    "estimatedDays": 3,
                    "order": 4
                }
            ]
        },
        {
            "name": "開発",
            "order": 2,
            "estimatedDays": 30,
            "tasks": [
                {
                    "name": "フロントエンド開発",
                    "description": "UI/UXの実装",
                    "estimatedDays": 12,
                    "order": 1
                },
                {
                    "name": "バックエンド開発",
                    "description": "API、ビジネスロジックの実装",
                    "estimatedDays": 12,
                    "order": 2
                },
                {
                    "name": "DB構築",
                    "description": "データベースの構築とマイグレーション",
                    "estimatedDays": 3,
                    "order": 3
                },
                {
                    "name": "単体テスト",
                    "description": "ユニットテストの作成と実行",
                    "estimatedDays": 3,
                    "order": 4
                }
            ]
        },
        {
            "name": "テスト・リリース",
            "order": 3,
            "estimatedDays": 14,
            "tasks": [
                {
                    "name": "結合テスト",
                    "description": "システム全体の結合テスト",
                    "estimatedDays": 5,
                    "order": 1
                },
                {
                    "name": "UAT",
                    "description": "ユーザー受け入れテスト",
                    "estimatedDays": 5,
                    "order": 2
                },
                {
                    "name": "本番環境構築",
                    "description": "本番環境のセットアップ",
                    "estimatedDays": 2,
                    "order": 3
                },
                {
                    "name": "リリース",
                    "description": "本番リリースと初期サポート",
                    "estimatedDays": 2,
                    "order": 4
                }
            ]
        }
    ]'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.project_templates WHERE name = '開発案件テンプレート'
);

-- 既存の場合は更新
UPDATE public.project_templates
SET
    description = 'カスタム開発プロジェクトの標準テンプレート。要件定義から本番リリースまでの開発プロセスを管理します。',
    project_type = 'joint_development'::public.project_type,
    phases = '[
        {
            "name": "要件定義・設計",
            "order": 1,
            "estimatedDays": 14,
            "tasks": [
                {
                    "name": "キックオフ",
                    "description": "プロジェクトキックオフミーティング",
                    "estimatedDays": 1,
                    "order": 1
                },
                {
                    "name": "要件定義",
                    "description": "機能要件・非機能要件の詳細化",
                    "estimatedDays": 5,
                    "order": 2
                },
                {
                    "name": "基本設計",
                    "description": "システムアーキテクチャ、画面設計",
                    "estimatedDays": 5,
                    "order": 3
                },
                {
                    "name": "詳細設計",
                    "description": "データベース設計、API設計",
                    "estimatedDays": 3,
                    "order": 4
                }
            ]
        },
        {
            "name": "開発",
            "order": 2,
            "estimatedDays": 30,
            "tasks": [
                {
                    "name": "フロントエンド開発",
                    "description": "UI/UXの実装",
                    "estimatedDays": 12,
                    "order": 1
                },
                {
                    "name": "バックエンド開発",
                    "description": "API、ビジネスロジックの実装",
                    "estimatedDays": 12,
                    "order": 2
                },
                {
                    "name": "DB構築",
                    "description": "データベースの構築とマイグレーション",
                    "estimatedDays": 3,
                    "order": 3
                },
                {
                    "name": "単体テスト",
                    "description": "ユニットテストの作成と実行",
                    "estimatedDays": 3,
                    "order": 4
                }
            ]
        },
        {
            "name": "テスト・リリース",
            "order": 3,
            "estimatedDays": 14,
            "tasks": [
                {
                    "name": "結合テスト",
                    "description": "システム全体の結合テスト",
                    "estimatedDays": 5,
                    "order": 1
                },
                {
                    "name": "UAT",
                    "description": "ユーザー受け入れテスト",
                    "estimatedDays": 5,
                    "order": 2
                },
                {
                    "name": "本番環境構築",
                    "description": "本番環境のセットアップ",
                    "estimatedDays": 2,
                    "order": 3
                },
                {
                    "name": "リリース",
                    "description": "本番リリースと初期サポート",
                    "estimatedDays": 2,
                    "order": 4
                }
            ]
        }
    ]'::jsonb,
    is_active = true,
    updated_at = now()
WHERE name = '開発案件テンプレート';

-- =============================================================================
-- 挿入結果の確認
-- =============================================================================
DO $$
DECLARE
    template_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count
    FROM public.project_templates
    WHERE name IN ('補助金営業テンプレート', 'ASP案件テンプレート', '開発案件テンプレート');

    RAISE NOTICE 'Business templates seeded: % templates', template_count;
END $$;

COMMIT;
