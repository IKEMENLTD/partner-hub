# パートナー協業プラットフォーム - Backend

NestJSで構築されたRESTful APIバックエンドです。

## 技術スタック

- **Framework**: NestJS 10
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **ORM**: TypeORM
- **Authentication**: Passport.js + JWT
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, Rate Limiting (Throttler)

## クイックスタート

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .env を編集

# 開発サーバー起動
npm run start:dev
```

## NPM スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run start:dev` | 開発サーバー (ホットリロード) |
| `npm run build` | プロダクションビルド |
| `npm run start:prod` | プロダクションサーバー |
| `npm test` | テスト実行 |
| `npm run test:watch` | テスト監視モード |
| `npm run test:cov` | カバレッジレポート |
| `npm run lint` | ESLint実行 |

## ディレクトリ構造

```
src/
├── common/              # 共通モジュール
│   ├── decorators/      # カスタムデコレーター
│   ├── dto/             # 共通DTO
│   ├── filters/         # 例外フィルター
│   ├── guards/          # 認証・認可ガード
│   └── interceptors/    # インターセプター
├── config/              # 設定ファイル
│   ├── app.config.ts
│   ├── database.config.ts
│   └── jwt.config.ts
└── modules/             # 機能モジュール
    ├── auth/            # 認証
    ├── dashboard/       # ダッシュボード
    ├── partner/         # パートナー管理
    ├── project/         # プロジェクト管理
    ├── reminder/        # リマインダー
    └── task/            # タスク管理
```

## API エンドポイント

### 認証 (`/api/v1/auth`)
- `POST /register` - ユーザー登録
- `POST /login` - ログイン
- `POST /logout` - ログアウト
- `POST /refresh` - トークンリフレッシュ
- `GET /me` - 現在のユーザー情報

### プロジェクト (`/api/v1/projects`)
- `GET /` - 一覧取得 (ページネーション)
- `POST /` - 作成
- `GET /:id` - 詳細取得
- `PATCH /:id` - 更新
- `DELETE /:id` - 削除
- `GET /:id/tasks` - プロジェクトのタスク一覧

### タスク (`/api/v1/tasks`)
- `GET /` - 一覧取得
- `POST /` - 作成
- `GET /:id` - 詳細取得
- `PATCH /:id` - 更新
- `DELETE /:id` - 削除
- `PATCH /:id/status` - ステータス更新
- `PATCH /:id/progress` - 進捗更新

### パートナー (`/api/v1/partners`)
- `GET /` - 一覧取得
- `POST /` - 登録
- `GET /:id` - 詳細取得
- `PATCH /:id` - 更新
- `DELETE /:id` - 削除

### ダッシュボード (`/api/v1/dashboard`)
- `GET /overview` - 概要
- `GET /my-today` - 本日のタスク
- `GET /manager` - マネージャー向け

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|----------|
| `NODE_ENV` | 環境 | development |
| `PORT` | ポート | 3000 |
| `DB_HOST` | DBホスト | localhost |
| `DB_PORT` | DBポート | 5432 |
| `DB_USERNAME` | DBユーザー | postgres |
| `DB_PASSWORD` | DBパスワード | - |
| `DB_DATABASE` | DB名 | partner_platform |
| `JWT_SECRET` | JWT秘密鍵 (本番32文字以上必須) | - |
| `JWT_EXPIRES_IN` | アクセストークン有効期限 | 15m |
| `JWT_REFRESH_SECRET` | リフレッシュトークン秘密鍵 | - |
| `JWT_REFRESH_EXPIRES_IN` | リフレッシュトークン有効期限 | 7d |
| `CORS_ORIGIN` | CORS許可オリジン | - |

## セキュリティ機能

- **JWT認証**: アクセストークン (15分) + リフレッシュトークン (7日)
- **パスワードポリシー**: 8文字以上、大小文字・数字・特殊文字必須
- **Rate Limiting**: 認証エンドポイントに厳格な制限
- **Security Headers**: Helmet によるヘッダー保護
- **Input Validation**: class-validator による厳密な検証
- **SQL Injection対策**: TypeORM パラメータバインディング + ホワイトリスト

## テスト

```bash
# 単体テスト
npm test

# カバレッジ付き
npm run test:cov

# 特定ファイル
npm test -- auth.service.spec.ts
```

### テストファイル
- `auth.service.spec.ts` - 認証サービス
- `project.service.spec.ts` - プロジェクトサービス
- `task.service.spec.ts` - タスクサービス
- `partner.service.spec.ts` - パートナーサービス
- `jwt-auth.guard.spec.ts` - JWT認証ガード
- `roles.guard.spec.ts` - ロールガード

## API ドキュメント

開発環境で http://localhost:3000/docs にアクセスするとSwagger UIが利用できます。

## ロール・権限

| ロール | 説明 |
|--------|------|
| `ADMIN` | 全機能へのアクセス |
| `MANAGER` | プロジェクト・タスク・パートナー管理 |
| `MEMBER` | 割り当てられたタスクの管理 |
| `PARTNER` | 割り当てられたタスクの閲覧・更新 |

## 本番デプロイチェックリスト

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` 32文字以上の強力な秘密鍵
- [ ] `JWT_REFRESH_SECRET` 32文字以上の強力な秘密鍵
- [ ] `CORS_ORIGIN` に本番ドメインを設定
- [ ] データベース接続にSSLを使用
- [ ] `LOG_LEVEL=info` 以上に設定
