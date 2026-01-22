-- プロジェクトテンプレート3種類を投入
-- 実行: Supabase SQL Editor

INSERT INTO project_templates (id, name, description, project_type, is_active, phases, created_at, updated_at)
VALUES
-- 補助金営業テンプレート
(
  uuid_generate_v4(),
  '補助金営業テンプレート',
  '補助金申請支援プロジェクトの標準テンプレート',
  'consulting',
  true,
  '[
    {
      "name": "ヒアリング・企画",
      "order": 1,
      "tasks": [
        {"name": "初回ヒアリング", "order": 1, "estimatedDays": 1},
        {"name": "補助金制度の選定", "order": 2, "estimatedDays": 2},
        {"name": "企画書作成", "order": 3, "estimatedDays": 3},
        {"name": "クライアント承認", "order": 4, "estimatedDays": 1}
      ]
    },
    {
      "name": "申請書作成",
      "order": 2,
      "tasks": [
        {"name": "事業計画書作成", "order": 1, "estimatedDays": 7},
        {"name": "必要書類の収集", "order": 2, "estimatedDays": 3},
        {"name": "申請書類のレビュー", "order": 3, "estimatedDays": 2},
        {"name": "最終確認・修正", "order": 4, "estimatedDays": 2}
      ]
    },
    {
      "name": "申請・フォロー",
      "order": 3,
      "tasks": [
        {"name": "補助金申請", "order": 1, "estimatedDays": 1},
        {"name": "審査状況確認", "order": 2, "estimatedDays": 3},
        {"name": "追加資料対応", "order": 3, "estimatedDays": 2},
        {"name": "結果報告", "order": 4, "estimatedDays": 1}
      ]
    }
  ]'::jsonb,
  now(),
  now()
),
-- ASP案件テンプレート
(
  uuid_generate_v4(),
  'ASP案件テンプレート',
  'ASP/SaaSサービス提供プロジェクトの標準テンプレート',
  'sales_partnership',
  true,
  '[
    {
      "name": "要件定義",
      "order": 1,
      "tasks": [
        {"name": "キックオフミーティング", "order": 1, "estimatedDays": 1},
        {"name": "現状分析", "order": 2, "estimatedDays": 3},
        {"name": "要件定義書作成", "order": 3, "estimatedDays": 4},
        {"name": "要件承認", "order": 4, "estimatedDays": 2}
      ]
    },
    {
      "name": "設定・カスタマイズ",
      "order": 2,
      "tasks": [
        {"name": "アカウント設定", "order": 1, "estimatedDays": 2},
        {"name": "マスタデータ登録", "order": 2, "estimatedDays": 3},
        {"name": "カスタマイズ開発", "order": 3, "estimatedDays": 7},
        {"name": "動作確認", "order": 4, "estimatedDays": 2}
      ]
    },
    {
      "name": "テスト・導入",
      "order": 3,
      "tasks": [
        {"name": "UAT実施", "order": 1, "estimatedDays": 3},
        {"name": "データ移行", "order": 2, "estimatedDays": 2},
        {"name": "本番リリース", "order": 3, "estimatedDays": 1},
        {"name": "運用サポート", "order": 4, "estimatedDays": 1}
      ]
    }
  ]'::jsonb,
  now(),
  now()
),
-- 開発案件テンプレート
(
  uuid_generate_v4(),
  '開発案件テンプレート',
  'カスタム開発プロジェクトの標準テンプレート',
  'joint_development',
  true,
  '[
    {
      "name": "要件定義・設計",
      "order": 1,
      "tasks": [
        {"name": "キックオフ", "order": 1, "estimatedDays": 1},
        {"name": "要件定義", "order": 2, "estimatedDays": 5},
        {"name": "基本設計", "order": 3, "estimatedDays": 5},
        {"name": "詳細設計", "order": 4, "estimatedDays": 3}
      ]
    },
    {
      "name": "開発",
      "order": 2,
      "tasks": [
        {"name": "フロントエンド開発", "order": 1, "estimatedDays": 12},
        {"name": "バックエンド開発", "order": 2, "estimatedDays": 12},
        {"name": "DB構築", "order": 3, "estimatedDays": 3},
        {"name": "単体テスト", "order": 4, "estimatedDays": 3}
      ]
    },
    {
      "name": "テスト・リリース",
      "order": 3,
      "tasks": [
        {"name": "結合テスト", "order": 1, "estimatedDays": 5},
        {"name": "UAT", "order": 2, "estimatedDays": 5},
        {"name": "本番環境構築", "order": 3, "estimatedDays": 2},
        {"name": "リリース", "order": 4, "estimatedDays": 2}
      ]
    }
  ]'::jsonb,
  now(),
  now()
)
ON CONFLICT DO NOTHING;

-- 投入確認
SELECT name, project_type, is_active FROM project_templates;
