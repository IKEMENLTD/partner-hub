# パートナー協業プラットフォーム - Frontend

React + TypeScriptで構築されたSPAフロントエンドです。

## 技術スタック

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand (クライアント状態) + TanStack Query (サーバー状態)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library

## クイックスタート

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

## NPM スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー (http://localhost:5173) |
| `npm run build` | プロダクションビルド |
| `npm run preview` | ビルドプレビュー |
| `npm test` | テスト実行 |
| `npm run test:ui` | Vitest UI |
| `npm run test:coverage` | カバレッジレポート |
| `npm run lint` | ESLint実行 |

## ディレクトリ構造

```
src/
├── components/          # UIコンポーネント
│   ├── common/          # 共通コンポーネント (Button, Input, Modal等)
│   └── layout/          # レイアウトコンポーネント
├── hooks/               # カスタムフック
│   ├── useAuth.ts
│   ├── useProjects.ts
│   └── useTasks.ts
├── pages/               # ページコンポーネント
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ProjectsPage.tsx
│   └── TasksPage.tsx
├── services/            # API サービス
│   ├── api.ts           # HTTPクライアント
│   ├── authService.ts
│   ├── projectService.ts
│   └── taskService.ts
├── store/               # 状態管理 (Zustand)
│   ├── authStore.ts     # 認証状態
│   └── uiStore.ts       # UI状態
├── test/                # テストユーティリティ
│   ├── setup.ts
│   └── test-utils.tsx
└── types/               # TypeScript型定義
```

## 機能

### 認証
- JWT認証 (アクセストークン + リフレッシュトークン)
- 自動トークンリフレッシュ
- セッションストレージ保存 (XSS対策)
- ロールベースアクセス制御

### ダッシュボード
- プロジェクト統計
- タスク進捗
- 期限アラート

### プロジェクト管理
- CRUD操作
- パートナー割り当て
- 進捗トラッキング

### タスク管理
- CRUD操作
- ステータス管理
- 担当者割り当て

## 状態管理

### authStore (Zustand + persist)
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

### uiStore (Zustand)
```typescript
interface UIState {
  sidebarOpen: boolean;
  projectListView: 'list' | 'grid' | 'kanban';
  theme: 'light' | 'dark' | 'system';
  notifications: Notification[];
}
```

## APIクライアント

`src/services/api.ts` は以下の機能を提供:

- **自動トークン付与**: 認証済みリクエストに自動でBearerトークン付与
- **トークンリフレッシュ**: 401エラー時に自動リフレッシュ
- **エラーハンドリング**:
  - `ApiError` - HTTPエラー
  - `NetworkError` - ネットワークエラー
  - `RateLimitError` - 429レート制限

## テスト

```bash
# 全テスト実行
npm test

# UI付き
npm run test:ui

# カバレッジ
npm run test:coverage
```

### テストファイル
- `LoginPage.test.tsx` - ログインページ
- `Button.test.tsx` - Buttonコンポーネント
- `authStore.test.ts` - 認証ストア
- `uiStore.test.ts` - UIストア

## 環境変数

`vite.config.ts` でAPIプロキシを設定:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

本番環境では環境変数 `VITE_API_URL` を使用してAPIエンドポイントを設定できます。

## コンポーネント設計

### 共通コンポーネント

#### Button
```tsx
<Button
  variant="primary | secondary | outline | ghost | danger"
  size="sm | md | lg"
  isLoading={boolean}
  fullWidth={boolean}
  leftIcon={ReactNode}
  rightIcon={ReactNode}
/>
```

#### Input
```tsx
<Input
  label="ラベル"
  error="エラーメッセージ"
  leftIcon={ReactNode}
  rightIcon={ReactNode}
/>
```

## セキュリティ

- **トークン保存**: sessionStorage (タブ閉じで削除)
- **自動リフレッシュ**: 401エラー時に透過的にリフレッシュ
- **XSS対策**: React自動エスケープ + CSP
- **CSRF対策**: SameSite Cookie (バックエンド側)

## 本番ビルド

```bash
npm run build
```

`dist/` ディレクトリに出力されます。Nginx等の静的ファイルサーバーで配信してください。

### Nginx設定例

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;
    root /var/www/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
