# Partner Hub - Supabase Database Migration

Partner HubのデータベースをRender.comからSupabaseに移行するためのスキーマとスクリプト集です。

## ディレクトリ構成

```
supabase/
├── README.md                      # このファイル
├── MIGRATION_DESIGN.md            # 移行設計書
├── 000_run_all_migrations.sql     # 統合実行スクリプト
├── 001_profiles_and_auth.sql      # profiles テーブルと認証設定
├── 002_partners.sql               # partners テーブル
├── 003_projects.sql               # projects 関連テーブル
├── 004_tasks.sql                  # tasks テーブル
├── 005_reminders.sql              # reminders と通知テーブル
├── 006_audit_logs.sql             # 監査ログと添付ファイル
├── 007_views_and_functions.sql    # ビューとユーティリティ関数
├── 008_data_migration.sql         # データ移行スクリプト
└── 009_seed_data.sql              # 開発用シードデータ
```

## 移行手順

### Phase 1: Supabase プロジェクト準備

1. **Supabaseプロジェクト作成**
   - [Supabase Dashboard](https://supabase.com/dashboard) で新規プロジェクトを作成
   - リージョンは東京（ap-northeast-1）を推奨

2. **接続情報の確認**
   - Project Settings > API から以下を取得:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`

### Phase 2: スキーマ作成

1. **SQL Editor を開く**
   - Supabase Dashboard > SQL Editor

2. **マイグレーションを順番に実行**
   ```
   001_profiles_and_auth.sql → 002_partners.sql → 003_projects.sql →
   004_tasks.sql → 005_reminders.sql → 006_audit_logs.sql →
   007_views_and_functions.sql
   ```

3. **Realtime を有効化**
   - Database > Replication から以下のテーブルを追加:
     - `tasks`
     - `reminders`
     - `projects`

### Phase 3: 既存データの移行

1. **Render.com からデータエクスポート**
   ```bash
   # pg_dump を使用
   pg_dump -h your-render-host -U your-user -d your-database \
     --data-only --format=plain > data_export.sql
   ```

2. **ユーザー移行**
   - Supabase Admin API を使用してユーザーを作成
   - 詳細は `008_data_migration.sql` を参照

3. **その他のデータ移行**
   - パートナー、プロジェクト、タスクなどを移行
   - ユーザーIDのマッピングに注意

### Phase 4: アプリケーション更新

1. **環境変数の更新**
   ```env
   # .env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **NestJS クライアント設定**
   ```typescript
   // src/config/supabase.config.ts
   import { createClient } from '@supabase/supabase-js'

   export const supabase = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_ANON_KEY
   )

   // サーバーサイド（service role）
   export const supabaseAdmin = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_SERVICE_ROLE_KEY
   )
   ```

## テーブル構成

### 主要テーブル

| テーブル名 | 説明 | RLS |
|-----------|------|-----|
| `profiles` | ユーザープロファイル（auth.usersと連携） | Yes |
| `partners` | パートナー企業・担当者 | Yes |
| `projects` | 案件 | Yes |
| `project_partners` | 案件とパートナーの関連 | Yes |
| `project_stakeholders` | 案件関係者 | Yes |
| `project_templates` | 案件テンプレート | Yes |
| `tasks` | タスク | Yes |
| `task_comments` | タスクコメント | Yes |
| `reminders` | リマインダー | Yes |
| `notification_logs` | 通知ログ | Yes |
| `attachments` | 添付ファイルメタデータ | Yes |
| `audit_logs` | 監査ログ | Yes |

### ENUM型

- `user_role`: admin, manager, member
- `partner_type`: company, individual
- `partner_status`: pending, active, inactive, suspended
- `project_type`: joint_development, sales_partnership, technology_license, reseller_agreement, consulting, other
- `project_status`: draft, planning, in_progress, on_hold, completed, cancelled
- `project_priority`: low, medium, high, critical
- `company_role`: prime, subcontractor, partner, client
- `stakeholder_tier`: tier1, tier2, tier3, tier4
- `task_status`: todo, in_progress, waiting, review, completed, cancelled
- `task_priority`: low, medium, high, critical
- `task_type`: task, feature, bug, improvement, documentation, research, other
- `reminder_type`: due_date, follow_up, status_change, custom
- `reminder_status`: pending, sent, delivered, failed, cancelled
- `reminder_channel`: email, in_app, slack, teams, webhook

## Row Level Security (RLS)

全テーブルでRLSが有効化されています。主なポリシー:

- **SELECT**: 認証済みユーザーはほとんどのデータを閲覧可能
- **INSERT**: 認証済みユーザー、または管理者権限が必要
- **UPDATE**: 所有者、担当者、または管理者のみ
- **DELETE**: 所有者または管理者のみ

## ヘルパー関数

| 関数名 | 説明 |
|-------|------|
| `get_current_user_role()` | 現在のユーザーのロールを取得 |
| `is_admin()` | 現在のユーザーがadminかどうか |
| `is_manager_or_above()` | 現在のユーザーがmanager以上かどうか |
| `calculate_project_progress(project_id)` | プロジェクトの進捗率を計算 |
| `calculate_project_health_score(project_id)` | プロジェクトの健全性スコアを計算 |
| `get_unread_notification_count()` | 未読通知数を取得 |
| `get_user_weekly_task_count(user_id)` | 今週のタスク数を取得 |
| `get_project_statistics()` | プロジェクト統計を取得 |
| `get_upcoming_tasks(days, limit)` | 期限が近いタスクを取得 |

## ビュー

| ビュー名 | 説明 |
|---------|------|
| `v_active_projects` | アクティブな案件一覧 |
| `v_project_summary` | 案件サマリー情報 |
| `v_overdue_tasks` | 期限切れタスク一覧 |
| `v_user_task_dashboard` | ユーザータスクダッシュボード |

## トラブルシューティング

### RLSエラー

```
new row violates row-level security policy
```

- 適切な認証状態でリクエストしているか確認
- ユーザーのロールがポリシーに合致しているか確認

### 外部キー制約エラー

```
insert or update on table "tasks" violates foreign key constraint
```

- 参照先のレコードが存在するか確認
- 移行時はIDマッピングが正しいか確認

### トリガーエラー

- profiles の自動作成トリガーは auth.users への INSERT で発火
- SECURITY DEFINER が設定されているか確認

## 参考リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
