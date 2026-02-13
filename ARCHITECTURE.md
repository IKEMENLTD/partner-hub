# Partner Hub - システムアーキテクチャ

> パートナー協業プラットフォーム（Partner Hub）の技術アーキテクチャドキュメント
> 最終更新: 2026-02-12

---

## 目次

1. [システム概要](#1-システム概要)
2. [技術スタック](#2-技術スタック)
3. [バックエンドアーキテクチャ](#3-バックエンドアーキテクチャ)
4. [フロントエンドアーキテクチャ](#4-フロントエンドアーキテクチャ)
5. [データベース設計](#5-データベース設計)
6. [認証・認可](#6-認証認可)
7. [マルチテナンシー](#7-マルチテナンシー)
8. [非同期処理・Cronジョブ](#8-非同期処理cronジョブ)
9. [通知システム](#9-通知システム)
10. [エラーハンドリング](#10-エラーハンドリング)
11. [セキュリティ](#11-セキュリティ)
12. [インフラ・デプロイ](#12-インフラデプロイ)
13. [テスト戦略](#13-テスト戦略)
14. [環境変数](#14-環境変数)

---

## 1. システム概要

Partner Hub は、企業間のパートナーシップ管理を支援するマルチテナント対応の Web アプリケーションです。

### 主要機能

| 機能カテゴリ | 概要 |
|-------------|------|
| **プロジェクト管理** | プロジェクトの作成・進捗管理・ヘルススコア自動算出 |
| **タスク管理** | タスク/サブタスク・担当者割当・ステータス追跡 |
| **パートナー管理** | パートナー招待(72時間)・評価(自動+手動)・連絡先設定 |
| **レポート** | 定期レポート生成(CSV/メール)・パートナー進捗報告(トークンベース) |
| **通知** | Email / In-App(WebSocket) / SMS(Twilio) |
| **エスカレーション** | ルールベース自動エスカレーション(期限前/超過/進捗低下) |
| **ダッシュボード** | 本日のタスク・管理者ダッシュボード・CSV エクスポート |
| **監査ログ** | 全 CRUD 操作の自動記録 |

### システム構成図

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
│         React 18 + Vite + TailwindCSS               │
│     Zustand (Auth/UI) + TanStack Query (API)        │
└──────────────┬────────────────────┬──────────────────┘
               │ REST API           │ WebSocket
               ▼                    ▼
┌─────────────────────────────────────────────────────┐
│              Backend (NestJS + TypeORM)              │
│  Guards → Interceptors → Controllers → Services     │
│          Port 3000 | API Prefix: /api/v1            │
├─────────────┬──────────────┬────────────────────────┤
│  Supabase   │  PostgreSQL  │  Redis (BullMQ)        │
│  Auth (JWT) │  (Supabase)  │  Job Queue             │
└─────────────┴──────────────┴────────────────────────┘
```

---

## 2. 技術スタック

### バックエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| NestJS | 10.3.0 | アプリケーションフレームワーク |
| TypeORM | 0.3.19 | ORM (PostgreSQL) |
| PostgreSQL | - | データベース (Supabase ホスト) |
| Supabase JS | 2.91.0 | 認証・ストレージクライアント |
| BullMQ | 5.1.0 | ジョブキュー |
| ioredis | 5.3.2 | Redis クライアント |
| Socket.io | - | WebSocket リアルタイム通信 |
| Helmet | 7.1.0 | セキュリティヘッダー |
| Swagger | 7.2.0 | API ドキュメント自動生成 |
| Twilio | 5.12.1 | SMS 通知 |

### フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 18.2.0 | UI フレームワーク |
| TypeScript | - | 型安全な開発 |
| Vite | - | ビルドツール |
| Zustand | 4.4.7 | クライアント状態管理 |
| TanStack Query | 5.17.0 | サーバー状態管理 |
| TailwindCSS | 3.4.1 | ユーティリティファースト CSS |
| React Router | 6.21.0 | ルーティング |
| Socket.io Client | 4.8.3 | WebSocket クライアント |
| Lucide React | 0.303.0 | アイコンライブラリ |
| date-fns | 3.2.0 | 日付操作 |

### インフラ

| 技術 | 用途 |
|------|------|
| Render.com | ホスティング (Backend: Docker, Frontend: Static) |
| Supabase | PostgreSQL + Auth + Storage |
| Redis | BullMQ ジョブキュー |
| GitHub Actions | CI/CD パイプライン |
| Docker | コンテナ化 |

---

## 3. バックエンドアーキテクチャ

### ディレクトリ構造

```
backend/src/
├── main.ts                    # アプリケーションブートストラップ
├── app.module.ts              # ルートモジュール (全モジュールインポート)
├── config/                    # 設定ファイル
│   ├── app.config.ts          #   アプリ設定 (ポート, CORS, ログレベル)
│   ├── database.config.ts     #   TypeORM + SSL 設定
│   ├── ssl.config.ts          #   SSL/TLS 証明書ハンドリング
│   ├── supabase.config.ts     #   Supabase URL + キー
│   ├── email.config.ts        #   SMTP/Resend 設定
│   ├── redis.config.ts        #   Redis 接続設定
│   └── data-source.ts         #   TypeORM データソース
├── common/                    # 共通モジュール
│   ├── guards/                #   認証・認可ガード
│   ├── interceptors/          #   リクエスト処理
│   ├── filters/               #   例外フィルター
│   ├── exceptions/            #   カスタム例外
│   ├── decorators/            #   カスタムデコレーター
│   ├── dto/                   #   共通 DTO
│   ├── entities/              #   ベースエンティティ
│   ├── services/              #   UserProfileCacheService
│   └── logger/                #   Winston ロガー
├── modules/                   # 機能モジュール (20モジュール)
│   ├── auth/                  #   認証・ユーザープロファイル
│   ├── organization/          #   組織管理・招待
│   ├── project/               #   プロジェクト管理
│   ├── task/                  #   タスク管理
│   ├── partner/               #   パートナー管理
│   ├── notification/          #   通知 (Email / In-App / SMS)
│   ├── escalation/            #   エスカレーション
│   ├── reminder/              #   リマインダー
│   ├── report/                #   レポート生成
│   ├── partner-report/        #   パートナーレポート (トークンベース)
│   ├── progress-report/       #   進捗報告 (3ステップウィザード)
│   ├── dashboard/             #   ダッシュボード
│   ├── file-storage/          #   ファイル管理 (Supabase Storage)
│   ├── search/                #   グローバル検索
│   ├── custom-field-template/ #   カスタムフィールド
│   ├── audit/                 #   監査ログ
│   ├── system-settings/       #   システム設定 (Twilio SMS)
│   ├── health/                #   ヘルスチェック
│   ├── supabase/              #   Supabase SDK ラッパー
│   └── queue/                 #   BullMQ ジョブ処理
└── migrations/                # TypeORM マイグレーション (9ファイル)
```

### ブートストラップ (main.ts)

```
起動時処理:
1. NestFactory.create(AppModule)
2. TypeORM 自動マイグレーション実行
3. グローバルミドルウェア設定
   - Helmet (セキュリティヘッダー)
   - CORS (環境別設定)
4. グローバルパイプ
   - ValidationPipe (whitelist: true)
5. レート制限
   - short: 3 req/sec
   - medium: 20 req/10sec
   - long: 100 req/min
6. Swagger (開発環境のみ)
7. Listen: port 3000, prefix: api/v1
```

### リクエスト処理パイプライン

```
Request
  → ThrottlerGuard (レート制限)
  → SupabaseAuthGuard (JWT 検証 + プロファイルキャッシュ)
  → RolesGuard (ロールベースアクセス制御)
  → OrganizationGuard (マルチテナンシー)
  → ValidationPipe (入力バリデーション)
  → LoggingInterceptor (リクエストログ)
  → MetricsInterceptor (メトリクス収集)
  → AuditInterceptor (監査ログ記録)
  → Controller → Service → Repository
  → TransformInterceptor (レスポンス標準化)
  → HttpExceptionFilter (エラーレスポンス)
Response
```

### 機能モジュール詳細

#### auth - 認証・ユーザー管理
- **エンティティ**: UserProfile (profiles テーブル)
- **機能**: プロファイル CRUD, ロール管理, Supabase Auth 同期

#### organization - 組織管理
- **エンティティ**: Organization, OrganizationMember, OrganizationInvitation
- **機能**: 組織作成, メンバー管理, 招待 (メール送信)

#### project - プロジェクト管理
- **エンティティ**: Project, ProjectPartner, ProjectStakeholder
- **ヘルススコア**: 50% 納期遵守 + 30% 完了率 + 20% 予算 (毎日深夜再計算)
- **ステークホルダー**: 数値 tier による階層構造 (parentStakeholderId で親子関係)
- **ステータス**: draft → planning → in_progress → on_hold → completed / cancelled

#### task - タスク管理
- **エンティティ**: Task, TaskSubtask, TaskComment
- **機能**: CRUD, サブタスク, コメント, 担当者/パートナー割当
- **ステータス**: todo → in_progress → waiting → review → completed / cancelled
- **優先度**: low / medium / high / urgent / critical
- **タイプ**: task / feature / bug / improvement / documentation / research / other

#### partner - パートナー管理
- **エンティティ**: Partner, PartnerInvitation, PartnerEvaluation
- **招待**: 72時間有効トークン, メール送信
- **評価**: 自動スコア (納期遵守率等) + 手動評価 (5段階レーティング)
- **連絡先設定**: 7日間有効トークン

#### notification - 通知システム
- **実装済みチャネル**: Email (Resend/SMTP) / In-App (DB + WebSocket) / SMS (Twilio)
- **コントローラー**: InAppNotificationController, NotificationSettingsController, ContactController
- **サービス**: NotificationService, InAppNotificationService, EmailService, DigestService, SmsService
- **WebSocket**: NotificationGateway (リアルタイムプッシュ)

#### escalation - エスカレーション
- **ルールタイプ**: DAYS_BEFORE_DUE / DAYS_AFTER_DUE / PROGRESS_BELOW
- **アクション**: NOTIFY_OWNER (In-App) / NOTIFY_STAKEHOLDERS (In-App) / ESCALATE_TO_MANAGER (Email)
- **SMS**: 期限超過時にパートナーの電話番号宛に Twilio SMS 送信
- **Cron**: 毎時実行

#### reminder - リマインダー
- **タイプ**: task_due / task_overdue / project_deadline / stagnant
- **チャネル**: Email / In-App
- **Cron**: 毎分実行, リトライ (最大3回)

#### report - レポート
- **エンティティ**: ReportConfig, GeneratedReport
- **機能**: レポート設定, 自動生成 (5分間隔 Cron), CSV/メール配信

#### partner-report - パートナーレポート
- **認証**: トークンベース (ログイン不要)
- **エンティティ**: PartnerReport, PartnerReportToken
- **ガード**: ReportTokenGuard

#### progress-report - 進捗報告
- **認証**: トークンベース (ログイン不要)
- **UI**: 3ステップウィザード形式

#### dashboard - ダッシュボード
- **全ユーザー向け**: my-today (本日のタスク), alerts (アラート)
- **管理者向け**: overview, project-summaries, partner-performance, upcoming-deadlines, overdue, recent-activity, task-distribution, project-progress, manager, CSV エクスポート

#### file-storage - ファイル管理
- **ストレージ**: Supabase Storage
- **制限**: 10MB, 許可拡張子ホワイトリスト

#### search - グローバル検索
- **対象**: プロジェクト / パートナー / タスク
- **機能**: 関連度スコアリング, organizationId フィルタリング

#### audit - 監査ログ
- **記録**: 全 CRUD 操作 (AuditInterceptor 経由)
- **クエリ**: エンティティ別/ユーザー別の履歴

#### system-settings - システム設定
- **機能**: Twilio SMS 設定 (AccountSid, AuthToken, PhoneNumber) の組織レベル管理
- **テスト送信**: SMS テスト送信エンドポイント
- **管理**: ADMIN ロール専用

---

## 4. フロントエンドアーキテクチャ

### ディレクトリ構造

```
frontend/src/
├── App.tsx                    # ルーティング + プロバイダー
├── main.tsx                   # エントリーポイント
├── lib/                       # ライブラリ設定
│   ├── supabase.ts            #   Supabase クライアント
│   └── queryClient.ts         #   TanStack Query 設定
├── store/                     # 状態管理 (Zustand)
│   ├── authStore.ts           #   認証状態 (セッション, リカバリーモード)
│   └── uiStore.ts             #   UI 状態 (サイドバー, テーマ)
├── services/                  # API サービス (~30ファイル)
│   ├── api.ts                 #   ベース fetch ラッパー (Bearer 認証)
│   └── ...                    #   各機能の API クライアント
├── hooks/                     # カスタムフック (~24ファイル)
│   └── ...                    #   TanStack Query ラッパー
├── pages/                     # ページコンポーネント (30ページ)
├── components/                # UI コンポーネント
│   ├── common/                #   汎用 (Button, Input, Modal, Table, Card, Toast, RoleGuard)
│   ├── layout/                #   レイアウト (MainLayout, Sidebar, Header, SearchBar)
│   ├── dashboard/             #   ダッシュボードウィジェット
│   ├── project/               #   プロジェクト関連
│   ├── task/                  #   タスク関連
│   ├── partner/               #   パートナー関連
│   ├── partner-portal/        #   公開パートナーポータル
│   ├── notifications/         #   通知パネル
│   ├── reports/               #   レポート
│   ├── settings/              #   設定・招待フォーム
│   ├── custom-fields/         #   カスタムフィールド
│   ├── stakeholders/          #   ステークホルダー階層
│   └── files/                 #   ファイルアップロード
└── types/                     # 共通型定義
```

### ルーティング構造 (App.tsx)

```
公開ルート (認証不要)
├── /login                        # ログイン
├── /register                     # 新規登録
├── /forgot-password              # パスワードリセット申請
├── /reset-password               # パスワード再設定
├── /progress-report/:token       # パートナー進捗報告 (トークン認証)
├── /partner/:token               # パートナーポータル (トークン認証)
├── /partner-setup/:token         # パートナー連絡先設定 (トークン認証)
├── /report/:token                # レガシーリダイレクト → /partner/:token
└── /dashboard/:token             # レガシーリダイレクト → /partner/:token

認証済みルート (全ユーザー)
├── /today                        # 本日のタスク (デフォルトページ)
├── /settings                     # ユーザー設定
├── /profile                      # プロフィール編集
├── /notifications                # 通知センター
├── /reminders                    # リマインダー管理
├── /projects                     # プロジェクト一覧
├── /projects/new                 # プロジェクト作成
├── /projects/:id                 # プロジェクト詳細
├── /projects/:id/edit            # プロジェクト編集
├── /projects/:id/tasks/new       # タスク作成
├── /projects/:id/tasks/:taskId   # タスク詳細
├── /projects/:id/tasks/:taskId/edit # タスク編集
├── /partners                     # パートナー一覧
├── /partners/:id                 # パートナー詳細
└── /partner-reports              # パートナーレポート一覧

管理者専用ルート (admin のみ)
├── /partners/new                 # パートナー新規作成
├── /partners/:id/edit            # パートナー編集
├── /manager                      # 管理者ダッシュボード
├── /reports                      # 自動レポート設定
├── /admin/settings               # システム設定 (SMS等)
├── /admin/escalations            # エスカレーションルール
├── /admin/users                  # ユーザー管理
├── /admin/invitations            # メンバー招待管理
├── /admin/custom-fields          # カスタムフィールド
├── /admin/audit                  # 監査ログ
└── /trash                        # ゴミ箱 (ソフトデリート復元)
```

### サイドバーナビゲーション

```
全ユーザー共通:
  ダッシュボード (/today)
  案件一覧 (/projects)
  パートナー (/partners)
  パートナー報告 (/partner-reports)
  リマインダー (/reminders)

管理者 (admin) のみ:
  マネージャー (/manager)
  自動レポート (/reports)
  エスカレーション (/admin/escalations)
  メンバー招待 (/admin/invitations)
  ユーザー管理 (/admin/users)
  カスタムフィールド (/admin/custom-fields)
  監査ログ (/admin/audit)
  ゴミ箱 (/trash)
```

### 状態管理パターン

```
┌─────────────────┬───────────────────────────┐
│  サーバー状態     │  TanStack Query           │
│  (API データ)    │  - キャッシュ + 自動再取得     │
│                 │  - 楽観的更新 (タスク等)      │
│                 │  - バックグラウンド再検証       │
├─────────────────┼───────────────────────────┤
│  クライアント状態  │  Zustand                  │
│  (認証)          │  authStore                │
│                 │  - Supabase セッション       │
│                 │  - リカバリーモード状態機械     │
│                 │  - sessionStorage 永続化    │
├─────────────────┼───────────────────────────┤
│  クライアント状態  │  Zustand                  │
│  (UI)           │  uiStore                  │
│                 │  - サイドバー開閉            │
│                 │  - テーマ (light/dark)      │
├─────────────────┼───────────────────────────┤
│  ローカル状態     │  localStorage             │
│                 │  - 最近のプロジェクト         │
│                 │  - UI 設定                 │
└─────────────────┴───────────────────────────┘
```

### 認証状態遷移 (authStore)

```
[初期状態] → [認証チェック中 (isInitialized=false)]
              │
  ┌───────────┼───────────┐
  ▼           ▼           ▼
[RECOVERY]  [SIGNED_IN]  [SIGNED_OUT]
  │           │
  │           └→ isAuthenticated=true
  │
  └→ isRecoveryMode=true, isAuthenticated=false
     │
     └→ パスワード更新後: exitRecoveryMode() → logout()
```

---

## 5. データベース設計

### テーブル一覧

```
認証・組織
├── profiles                   # ユーザープロファイル (auth.users 拡張)
├── organizations              # 組織
└── organization_members       # 組織メンバーシップ

パートナー
├── partners                   # パートナー企業/個人
├── partner_invitations        # 招待 (72時間トークン)
└── partner_evaluations        # パートナー評価

プロジェクト
├── projects                   # プロジェクト
├── project_partners           # プロジェクト-パートナー関連
├── project_stakeholders       # ステークホルダー (数値 tier, 親子関係)
└── project_files              # プロジェクトファイル

タスク
├── tasks                      # タスク (ソフトデリート対応)
├── task_subtasks              # サブタスク
└── task_comments              # タスクコメント

通知
├── notification_settings      # ユーザー通知設定
├── notification_channels      # 通知チャネル設定
├── notification_logs          # 通知送信ログ
└── in_app_notifications       # アプリ内通知

リマインダー・エスカレーション
├── reminders                  # スケジュールリマインダー
├── escalation_rules           # エスカレーションルール
└── escalation_logs            # エスカレーション履歴

レポート
├── report_configs             # レポート設定 (ソフトデリート対応)
├── generated_reports          # 生成済みレポート
├── partner_reports            # パートナーレポート
├── partner_report_tokens      # レポートトークン (7日間)
├── report_requests            # レポートリクエスト
├── report_schedules           # レポートスケジュール
└── progress_reports           # 進捗レポート

その他
├── audit_logs                 # 監査ログ
├── custom_field_templates     # カスタムフィールドテンプレート
└── system_settings            # システム設定 (Twilio SMS)
```

### 主要ENUM型

| ENUM | 値 |
|------|-----|
| `user_role` | admin, member, partner |
| `partner_status` | pending, active, inactive, suspended |
| `partner_type` | individual, company |
| `project_status` | draft, planning, in_progress, on_hold, completed, cancelled |
| `project_priority` | low, medium, high, critical |
| `task_status` | todo, in_progress, waiting, review, completed, cancelled |
| `task_priority` | low, medium, high, urgent, critical |
| `task_type` | task, feature, bug, improvement, documentation, research, other |
| `reminder_status` | pending, sent, delivered, failed, cancelled |

### マイグレーション管理

```
database/
├── schema.sql                 # 初期スキーマ
├── migrations/                # メインマイグレーション (001-013)
├── supabase/                  # Supabase 固有 (000-024 + COMPLETE_MIGRATION.sql)
└── seeds/                     # シードデータ (テンプレート, ルール)

backend/src/migrations/        # TypeORM マイグレーション (9ファイル)
```

### ER図 (主要リレーション)

```
organizations ─1:N─ profiles ─1:N─ tasks (assignee)
     │                  │              │
     │                  │              ├── task_subtasks
     │                  │              └── task_comments
     │                  │
     └── 1:N ── projects ─M:N─ partners
                    │              │
                    │              └── partner_evaluations
                    │
                    ├── project_stakeholders
                    ├── project_files
                    ├── tasks
                    ├── reminders
                    ├── escalation_rules
                    └── report_configs
```

---

## 6. 認証・認可

### 認証フロー

```
1. [Frontend] Supabase SDK でログイン
2. [Frontend] JWT アクセストークン取得 → authStore に保存
3. [Frontend] API リクエストに Bearer トークン付与
4. [Backend]  SupabaseAuthGuard が JWT を SUPABASE_JWT_SECRET で検証
5. [Backend]  UserProfile をキャッシュ or DB から取得
6. [Backend]  新規ユーザーの場合: 組織セットアップ (招待トークンあり → 既存組織に参加, なし → 新規組織作成)
7. [Backend]  request.user にプロファイル設定
```

### 認可ガード

| ガード | 適用 | 説明 |
|--------|------|------|
| `SupabaseAuthGuard` | グローバル | JWT 検証 + ユーザープロファイル解決 |
| `RolesGuard` | `@Roles()` デコレーター | ロールベースアクセス制御 |
| `OrganizationGuard` | グローバル | マルチテナンシー組織フィルタ |
| `PartnerAccessGuard` | パートナー操作 | パートナーリソースへのアクセス権 |
| `ProjectAccessGuard` | プロジェクト操作 | プロジェクトリソースへのアクセス権 |
| `TaskAccessGuard` | タスク操作 | タスクリソースへのアクセス権 |
| `ReportTokenGuard` | パートナーレポート/進捗報告 | トークンベース認証 (ログイン不要) |

### ロール体系

実運用上は **admin** と **member** の2ロールで運用。フロントエンドは `user.role === 'admin'` で管理者判定。

| 機能 | admin | member |
|------|:-----:|:------:|
| 本日のタスク・プロジェクト閲覧 | o | o |
| タスク作成・編集 | o | o |
| パートナー閲覧 | o | o |
| パートナー作成・編集 | o | - |
| 管理者ダッシュボード | o | - |
| 自動レポート設定 | o | - |
| エスカレーションルール | o | - |
| ユーザー管理・招待 | o | - |
| カスタムフィールド | o | - |
| 監査ログ閲覧 | o | - |
| ゴミ箱 (ソフトデリート復元) | o | - |
| システム設定 (SMS) | o | - |

パートナーはログイン不要で、トークンベースで進捗報告・ポータル閲覧のみ。

---

## 7. マルチテナンシー

### 設計方針

- **共有データベース・共有スキーマ** モデル
- 全主要テーブルに `organization_id` カラム
- アプリケーションレベル + DB レベル (RLS) の二重フィルタリング

### フィルタリング実装

```
[Controller]
  @CurrentUser('organizationId') organizationId: string
      │
      ▼
[Service]
  findAll(organizationId): クエリに .where('organizationId = :orgId') 追加
  findOne(id, organizationId): 取得後に AuthorizationException でアクセス検証
  create(dto, organizationId): エンティティに organizationId を設定
      │
      ▼
[Database - RLS]
  Row Level Security ポリシーで organization_id によるフィルタリング
```

### 対応済みモジュール

全業務モジュール (auth, audit, custom-field-template, dashboard, escalation, file-storage, notification, organization, partner, partner-report, progress-report, project, reminder, report, search, system-settings, task) で organizationId フィルタリングを実装済み。

---

## 8. 非同期処理・Cronジョブ

### Cron ジョブスケジュール

| ジョブ | スケジュール | モジュール | 説明 |
|--------|------------|-----------|------|
| ヘルススコア再計算 | 毎日 0:00 | project | 全プロジェクトのスコア再算出 |
| デイリーダイジェスト | 毎日 7:00 (JST) | notification | タスク要約メール配信 |
| リマインダー処理 | 毎分 | reminder | 予定リマインダーの送信 |
| エスカレーション | 毎時 | escalation | ルール評価 + 通知 |
| レポート生成 | 5分間隔 | report | スケジュール済みレポートの生成 |

### BullMQ ジョブキュー

- **Redis** ベースのジョブキュー
- バックグラウンドでのメール送信、レポート生成
- リトライ機構 (最大3回)

---

## 9. 通知システム

### アーキテクチャ

```
通知トリガー
├── ReminderService (Cron) ─────┐
├── EscalationService (Cron) ──┤
├── TaskService (ステータス変更) ─┤
└── ProjectService (期限) ──────┘
                                │
                    ┌───────────▼────────────┐
                    │   NotificationService    │
                    │   (チャネル振り分け)       │
                    ├─────────┬─────────┬─────┤
                    │ Email   │ In-App  │ SMS │
                    │         │         │     │
                    │ Resend/ │ DB保存 + │Twilio│
                    │ SMTP    │ WebSocket│     │
                    └─────────┴─────────┴─────┘
```

### 実装済みチャネル

| チャネル | 技術 | 用途 |
|---------|------|------|
| **Email** | Resend / SMTP | リマインダー, エスカレーション, ダイジェスト, レポート配信 |
| **In-App** | PostgreSQL + WebSocket (Socket.io) | リアルタイム通知, アラート |
| **SMS** | Twilio | エスカレーション時のパートナー緊急連絡 |

### デイリーダイジェスト

- 毎日 7:00 JST 配信
- ユーザーごとに organizationId でフィルタリング
- 内容: 本日のタスク, 期限超過タスク, 未読通知, 達成率統計
- バッチ処理 (50ユーザーずつ)

---

## 10. エラーハンドリング

### 例外階層

```
BaseException
├── ResourceNotFoundException   # リソース未発見 (404)
│   ├── .forProject(id)        #   ファクトリメソッド
│   ├── .forTask(id)
│   ├── .forPartner(id)
│   └── ...
├── BusinessException           # ビジネスロジック違反 (400)
├── AuthorizationException      # 認可エラー (403)
├── AuthenticationException     # 認証エラー (401)
├── ValidationException         # バリデーションエラー (422)
├── ConflictException           # リソース競合 (409)
└── SystemException             # システムエラー (500)
```

### エラーコード体系

| プレフィックス | 領域 |
|-------------|------|
| `AUTH_xxx` | 認証・認可 |
| `USER_xxx` | ユーザー管理 |
| `PROJECT_xxx` | プロジェクト |
| `TASK_xxx` | タスク |
| `PARTNER_xxx` | パートナー |
| `FILE_xxx` | ファイル管理 |
| `VALIDATION_xxx` | バリデーション |
| `SYSTEM_xxx` | システム |

### APIレスポンス標準形式

```json
// 成功
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-02-12T...",
  "path": "/api/v1/projects"
}

// エラー
{
  "success": false,
  "error": {
    "code": "PROJECT_001",
    "message": "プロジェクトが見つかりません",
    "details": { "resourceType": "Project", "resourceId": "abc-123" }
  },
  "timestamp": "2026-02-12T...",
  "path": "/api/v1/projects/abc-123"
}
```

---

## 11. セキュリティ

### 実装済みセキュリティ対策

| カテゴリ | 対策 | 実装箇所 |
|---------|------|---------|
| **認証** | Supabase JWT 検証 | SupabaseAuthGuard |
| **認可** | RBAC (admin / member) | RolesGuard |
| **マルチテナンシー** | organizationId フィルタ | 全 Service + RLS |
| **入力検証** | ValidationPipe (whitelist) | グローバル |
| **SQLインジェクション** | ALLOWED_SORT_COLUMNS ホワイトリスト | 各 Service |
| **XSS** | Helmet CSP ヘッダー + sessionStorage | main.ts, authStore |
| **レート制限** | 3段階スロットリング | ThrottlerGuard |
| **CORS** | 環境別ホワイトリスト | main.ts |
| **SSL/TLS** | 本番: 証明書検証強制 | database.config.ts |
| **ソフトデリート** | 物理削除防止 | Partner, Project, Task, ReportConfig |
| **監査ログ** | 全CRUD操作記録 | AuditInterceptor |
| **ファイル制限** | 10MB + 拡張子ホワイトリスト | FileStorageService |

---

## 12. インフラ・デプロイ

### Docker 構成

```yaml
# docker-compose.yml (開発環境)
services:
  redis:        # Redis 7-alpine (BullMQ用)
    port: 6379
  backend:      # NestJS (Dockerfile)
    port: 3000
    depends_on: redis
  frontend:     # React + Vite (Dockerfile)
    port: 5173
    depends_on: backend
```

```dockerfile
# backend/Dockerfile.prod (本番)
# マルチステージビルド
Stage 1: builder   → npm ci + npm run build
Stage 2: production → dist + node_modules (--omit=dev)
                      非 root ユーザー実行
                      ヘルスチェック: /api/v1/health/liveness
```

### Render.com デプロイ

```yaml
# render.yaml
services:
  - name: partner-hub-backend
    type: web
    runtime: docker
    dockerfilePath: backend/Dockerfile.prod
    plan: starter

  - name: partner-hub-frontend
    type: web
    runtime: static
    buildCommand: npm install && npm run build
    staticPublishPath: dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html    # SPA ルーティング対応
```

### CI/CD パイプライン

```
┌─────────────────────────────────────────────┐
│  GitHub Actions CI (.github/workflows/ci.yml) │
├─────────────────────────────────────────────┤
│  backend-test:                              │
│    npm ci → lint → test → test:cov          │
│                                             │
│  frontend-test:                             │
│    npm ci → lint → type-check → test        │
│    coverage thresholds: 60/60/50            │
│                                             │
│  build-check:                               │
│    backend build + frontend build           │
│                                             │
│  security-audit:                            │
│    npm audit (high/critical)                │
└───────────────────┬─────────────────────────┘
                    │ on: push to main
                    ▼
┌─────────────────────────────────────────────┐
│  Deploy (.github/workflows/deploy.yml)       │
├─────────────────────────────────────────────┤
│  verify-ci                                  │
│    → deploy-backend (Render API)            │
│    → deploy-frontend (Render API)           │
│    → health-check (10回リトライ, 10秒間隔)    │
│    → notify (結果通知)                       │
└─────────────────────────────────────────────┘
```

---

## 13. テスト戦略

### バックエンド (Jest)

- **単体テスト**: 各 Controller / Service の spec ファイル
- **モック**: TypeORM Repository, 外部サービス (Supabase, Email, Twilio)
- **カバレッジ**: `npm run test:cov`
- **テスト数**: 1,039+

### フロントエンド (Vitest)

- **単体テスト**: 各ページ / コンポーネントのテスト
- **ツール**: @testing-library/react, @testing-library/user-event
- **カバレッジ閾値**: Statements 60%, Branches 60%, Functions 50%

### テスト実行

```bash
cd backend && npm test              # バックエンド全テスト
cd backend && npm run test:cov      # カバレッジ付き

cd frontend && npm test             # フロントエンド全テスト
cd frontend && npm run test:coverage # カバレッジ付き
```

---

## 14. 環境変数

### バックエンド (.env)

```bash
# アプリケーション
NODE_ENV=development|production|test
PORT=3000
API_PREFIX=api/v1
LOG_LEVEL=debug|info|warn|error
CORS_ORIGIN=https://yourdomain.com
REMINDER_CHECK_INTERVAL=60000

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret

# データベース
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DB_SSL_REJECT_UNAUTHORIZED=true       # 本番: true 固定
DB_SSL_CA_CERT=/path/to/cert          # オプション

# Redis
REDIS_URL=redis://localhost:6379

# メール (Resend/SMTP)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=re_xxx
SMTP_FROM=noreply@mail.partnerhub.ikemen.ltd
SMTP_FROM_NAME=Partner Collaboration Platform
```

### フロントエンド (.env)

```bash
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## プロジェクト統計

| 指標 | 数値 |
|------|------|
| バックエンドモジュール | 20 |
| フロントエンドページ | 30 |
| フロントエンド API サービス | ~30 |
| フロントエンドカスタムフック | ~24 |
| データベーステーブル | 30+ |
| バックエンドテスト数 | 1,039+ |
| 総ソースファイル数 | ~537 |
