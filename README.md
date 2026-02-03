# パートナー協業プラットフォーム

パートナー企業との協業を効率化するための統合プラットフォームです。プロジェクト管理、タスク管理、パートナー管理機能を提供します。

## 機能概要

- **認証・認可**: Supabase Auth、ロールベースアクセス制御 (RBAC)
- **プロジェクト管理**: プロジェクトの作成・進捗管理・パートナー割り当て
- **タスク管理**: タスクの作成・割り当て・ステータス管理・サブタスク
- **パートナー管理**: パートナー登録・評価・スキル管理
- **ダッシュボード**: リアルタイム統計・進捗可視化
- **リマインダー**: 期限通知・自動リマインド機能

## 技術スタック

### Backend
- **Runtime**: Node.js 18+
- **Framework**: NestJS
- **Database**: PostgreSQL (Supabase)
- **ORM**: TypeORM
- **Authentication**: Supabase Auth
- **API Documentation**: Swagger/OpenAPI
- **Security**: Helmet, Rate Limiting

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand + TanStack Query
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Testing**: Vitest + React Testing Library

## クイックスタート

### 前提条件

- Node.js 18 以上
- PostgreSQL 14 以上
- npm または yarn

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd 20260119
```

### 2. Backend セットアップ

```bash
cd backend

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .env ファイルを編集して適切な値を設定

# データベースの作成
createdb partner_platform

# 開発サーバーの起動
npm run start:dev
```

### 3. Frontend セットアップ

```bash
cd frontend

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

### 4. アクセス

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api/v1
- **API Documentation**: http://localhost:3000/docs

## 環境変数

### Backend (.env)

```bash
# Application
NODE_ENV=development          # 環境 (development/production/test)
PORT=3000                     # APIサーバーのポート
API_PREFIX=api/v1             # APIプレフィックス

# ===========================================
# Supabase Configuration (必須)
# Supabase Dashboard > Project Settings > API から取得
# ===========================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-dashboard

# Database URL (Supabase PostgreSQL 接続文字列)
# Supabase Dashboard > Project Settings > Database > Connection string > URI
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project.supabase.co:5432/postgres

# ===========================================
# SSL Configuration
# ===========================================
# 開発環境でのSSL証明書検証スキップ（自己署名証明書用）
# 本番環境では無視される（常にtrue）
DB_SSL_REJECT_UNAUTHORIZED=true

# カスタムCA証明書（PEM文字列またはファイルパス）
# DB_SSL_CA_CERT=/path/to/ca-certificate.crt

# テスト環境でのみSSL無効化を許可
# ALLOW_INSECURE_TEST_DB=false

# ===========================================
# Optional Settings
# ===========================================
# Logging
LOG_LEVEL=debug               # ログレベル (debug/info/warn/error)

# Reminder Settings
REMINDER_CHECK_INTERVAL=60000 # リマインダーチェック間隔（ミリ秒）

# CORS (本番環境用、カンマ区切りで複数指定可)
CORS_ORIGIN=https://app.yourdomain.com
```

## NPM スクリプト

### Backend

```bash
npm run start:dev     # 開発サーバー起動 (ホットリロード)
npm run build         # プロダクションビルド
npm run start:prod    # プロダクションサーバー起動
npm test              # テスト実行
npm run test:watch    # テスト監視モード
npm run test:cov      # カバレッジレポート生成
npm run lint          # ESLint 実行
```

### Frontend

```bash
npm run dev           # 開発サーバー起動
npm run build         # プロダクションビルド
npm run preview       # ビルドプレビュー
npm test              # テスト実行
npm run test:coverage # カバレッジレポート生成
npm run lint          # ESLint 実行
```

## プロジェクト構造

```
.
├── backend/                    # NestJS バックエンド
│   ├── src/
│   │   ├── common/            # 共通モジュール (Guards, Filters, Decorators)
│   │   ├── config/            # 設定ファイル
│   │   └── modules/           # 機能モジュール
│   │       ├── auth/          # 認証
│   │       ├── dashboard/     # ダッシュボード
│   │       ├── partner/       # パートナー管理
│   │       ├── project/       # プロジェクト管理
│   │       ├── reminder/      # リマインダー
│   │       └── task/          # タスク管理
│   └── test/                  # E2Eテスト
├── frontend/                   # React フロントエンド
│   └── src/
│       ├── components/        # UIコンポーネント
│       ├── hooks/             # カスタムフック
│       ├── pages/             # ページコンポーネント
│       ├── services/          # API サービス
│       ├── store/             # 状態管理 (Zustand)
│       └── types/             # TypeScript 型定義
├── database/                   # データベース設計ドキュメント
└── docs/                       # API仕様書
```

## API ドキュメント

開発環境では Swagger UI でAPIドキュメントを確認できます:
http://localhost:3000/docs

詳細なAPI仕様は `/docs/api-specification.md` を参照してください。

## セキュリティ

### 認証アーキテクチャ

本システムは **Supabase Auth** を認証基盤として採用しています。

```
[フロントエンド]                    [バックエンド]
     │                                   │
     │ 1. Supabase SDK でログイン        │
     │─────────────────────────────────→ │ Supabase Auth
     │                                   │
     │ 2. JWT トークン取得               │
     │←───────────────────────────────── │
     │                                   │
     │ 3. API リクエスト (Bearer token)  │
     │─────────────────────────────────→ │
     │                                   │ JwtAuthGuard で検証
     │ 4. レスポンス                     │
     │←───────────────────────────────── │
```

**主な特徴:**
- Supabase Auth がトークン発行・検証を担当
- バックエンドは Supabase JWT Secret でトークン検証
- セッション管理は Supabase + フロントエンド Zustand ストア
- パスワードリセットフローはリカバリーモードで状態管理

### 実装済みセキュリティ対策

- **認証**: Supabase Auth (JWTトークンベース)
- **認可**: ロールベースアクセス制御 (ADMIN, MANAGER, MEMBER, PARTNER)
- **Rate Limiting**: 全エンドポイントに適用 (Throttler)
- **Security Headers**: Helmet によるセキュリティヘッダー設定
- **Input Validation**: class-validator による厳密なバリデーション
- **SQL Injection 防止**: TypeORM パラメータバインディング + ソートカラムのホワイトリスト
- **SSL/TLS**: 本番環境では証明書検証を強制（MITM攻撃防止）

### 本番環境チェックリスト

- [ ] `NODE_ENV=production` を設定
- [ ] Supabase環境変数をすべて設定
- [ ] CORS_ORIGIN に本番ドメインを設定
- [ ] データベース接続にSSLを使用（本番では自動的に証明書検証が有効）
- [ ] HTTPS を有効化
- [ ] ログレベルを `info` 以上に設定
- [ ] `DB_SSL_REJECT_UNAUTHORIZED` は設定しない（本番では無視される）

## テスト

### テスト実行

```bash
# Backend
cd backend
npm test              # 単体テスト
npm run test:cov      # カバレッジ付き

# Frontend
cd frontend
npm test              # 単体テスト
npm run test:coverage # カバレッジ付き
```

### テストカバレッジ目標

- Backend: 70%以上 (認証・ガード: 85%以上)
- Frontend: 70%以上 (Store: 90%以上)

詳細は `TEST_COVERAGE_REPORT.md` を参照してください。

## ユーザーロール

| ロール | 説明 | 権限 |
|--------|------|------|
| ADMIN | システム管理者 | 全機能へのフルアクセス |
| MANAGER | プロジェクトマネージャー | プロジェクト・タスク管理、パートナー管理 |
| MEMBER | チームメンバー | タスクの閲覧・更新、自分の担当タスク管理 |
| PARTNER | パートナー | 割り当てられたタスクの閲覧・更新 |

## 開発ガイドライン

### コーディング規約

- ESLint + Prettier による自動フォーマット
- TypeScript strict モード有効
- コンポーネント: 関数コンポーネント + Hooks
- 状態管理: サーバー状態は TanStack Query、クライアント状態は Zustand

### Git ブランチ戦略

```
main          # 本番環境
├── develop   # 開発環境
│   ├── feature/*   # 新機能
│   ├── bugfix/*    # バグ修正
│   └── hotfix/*    # 緊急修正
```

## トラブルシューティング

### よくある問題

**Q: データベース接続エラー**
```
A: PostgreSQLが起動しているか確認し、.env の接続情報を確認してください。
```

**Q: 認証エラー (Invalid token)**
```
A: Supabase環境変数が正しく設定されているか確認してください。
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
```

**Q: CORS エラー**
```
A: 開発環境ではフロントエンドが localhost:5173 で動作していることを確認。
本番環境では CORS_ORIGIN に正しいドメインを設定してください。
```

## ライセンス

Private - All rights reserved

## サポート

問題が発生した場合は、Issue を作成するか、開発チームにお問い合わせください。
