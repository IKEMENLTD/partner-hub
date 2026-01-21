# Partner Hub - Supabase移行設計書

## 1. Supabase Auth と既存usersテーブルの関係

### 1.1 Supabase Authの仕組み

Supabase Authは `auth.users` テーブルを自動管理します。このテーブルには以下の情報が含まれます：

- `id` (UUID): ユーザーの一意識別子
- `email`: メールアドレス
- `encrypted_password`: パスワードハッシュ（Supabaseが管理）
- `email_confirmed_at`: メール確認日時
- `created_at`, `updated_at`: タイムスタンプ
- その他認証関連のメタデータ

### 1.2 設計方針: profiles テーブルの作成

**推奨アプローチ**: `auth.users` を認証専用とし、アプリケーション固有のユーザー情報は `public.profiles` テーブルで管理する。

```
┌─────────────────────┐         ┌─────────────────────────┐
│    auth.users       │         │    public.profiles      │
│ (Supabase管理)      │         │ (アプリ管理)            │
├─────────────────────┤   1:1   ├─────────────────────────┤
│ id (PK)             │◄────────│ id (PK, FK → auth.users)│
│ email               │         │ email                   │
│ encrypted_password  │         │ first_name              │
│ ...                 │         │ last_name               │
└─────────────────────┘         │ role                    │
                                │ department              │
                                │ ...                     │
                                └─────────────────────────┘
```

### 1.3 auth.users と profiles の連携方法

1. **自動プロファイル作成**: `auth.users` に新しいユーザーが作成されると、トリガーで `profiles` に対応するレコードを自動作成
2. **ID共有**: `profiles.id` は `auth.users.id` と同じUUIDを使用（外部キー制約）
3. **RLSによるアクセス制御**: `auth.uid()` を使用してログインユーザーのデータのみアクセス可能に

---

## 2. スキーマ設計

### 2.1 テーブル構成（移行後）

```
public/
├── profiles                    # ユーザープロファイル（auth.usersを参照）
├── partners                    # パートナー企業/担当者（既存organizations + persons を統合簡略化）
├── projects                    # 案件
├── project_stakeholders        # 案件関係者
├── tasks                       # タスク
├── reminders                   # リマインダー
├── notification_logs           # 通知ログ
├── project_templates           # 案件テンプレート
└── audit_logs                  # 監査ログ
```

### 2.2 既存エンティティとの対応

| 既存（TypeORM/Render） | Supabase移行後 | 備考 |
|----------------------|---------------|------|
| users | profiles | auth.usersと連携 |
| partners | partners | そのまま移行 |
| projects | projects | そのまま移行 |
| project_stakeholders | project_stakeholders | 簡略化 |
| tasks | tasks | そのまま移行 |
| reminders | reminders | そのまま移行 |
| project_templates | project_templates | そのまま移行 |

---

## 3. Row Level Security (RLS) 設計

### 3.1 RLSポリシー設計方針

1. **認証必須**: 全テーブルでRLSを有効化し、未認証アクセスを拒否
2. **ロールベース**: admin, manager, member の3つのロールで権限を分離
3. **所有権**: 自分が作成/割り当てられたリソースのみ操作可能（一部例外あり）

### 3.2 各テーブルのRLSポリシー

| テーブル | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| profiles | 全員閲覧可 | トリガーのみ | 自分のみ | 禁止 |
| partners | 全員閲覧可 | admin/manager | admin/manager | admin |
| projects | 全員閲覧可 | admin/manager | owner/admin | admin |
| tasks | 関係者のみ | 認証済み | assignee/owner | owner/admin |
| reminders | 関係者のみ | 認証済み | 作成者 | 作成者/admin |

---

## 4. 既存データの移行

### 4.1 移行手順

1. **Supabaseプロジェクト作成**
2. **スキーマ作成**: SQL実行でテーブル、RLS、トリガーを作成
3. **既存データエクスポート**: Render.comからCSV/SQLダンプでエクスポート
4. **ユーザー移行**: 特別な処理が必要（後述）
5. **その他データ移行**: 通常のINSERT文で移行
6. **アプリケーション更新**: NestJS側のSupabaseクライアント設定

### 4.2 ユーザーデータ移行の注意点

既存のパスワードハッシュ（bcrypt）はSupabase Authに直接インポートできません。

**選択肢:**

1. **パスワードリセット強制**: 全ユーザーにパスワードリセットを要求
2. **Supabase Admin API使用**: `supabase.auth.admin.createUser()` でユーザー作成後、パスワードリセットメール送信
3. **カスタム認証フロー**: 初回ログイン時に既存パスワードを検証し、Supabase側でユーザー作成

**推奨**: 選択肢2（Admin APIを使用し、既存ユーザーにパスワード再設定を案内）

---

## 5. 補足情報

### 5.1 Supabase固有機能の活用

- **Realtime**: タスク更新のリアルタイム通知
- **Storage**: 添付ファイルの管理
- **Edge Functions**: リマインダー通知の定期実行
- **pg_cron**: 定期バッチ処理

### 5.2 移行スケジュール目安

1. 開発環境でのテスト: 1週間
2. ステージング環境でのテスト: 1週間
3. 本番移行: 1日（メンテナンス時間帯）
4. 監視期間: 1週間
