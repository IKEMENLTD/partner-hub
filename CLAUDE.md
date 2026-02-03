# CLAUDE.md - プロジェクト知識ベース

このファイルは、Claude Codeとの対話で得られた知見を蓄積するための知識ベースです。

## プロジェクト構成

### アーキテクチャ概要
- **Backend**: NestJS + TypeORM + PostgreSQL (Supabase)
- **Frontend**: React 18 + TypeScript + Vite
- **認証**: Supabase Auth (JWT ベース)
- **状態管理**: Zustand (クライアント) + TanStack Query (サーバー)

### ディレクトリ構造
```
/backend
  /src
    /common        - 共通モジュール (Guards, Filters, Decorators)
    /config        - 設定ファイル (database, supabase, etc.)
    /modules       - 機能モジュール (auth, project, task, partner, etc.)
/frontend
  /src
    /components    - UIコンポーネント
    /hooks         - カスタムフック
    /pages         - ページコンポーネント
    /services      - API サービス
    /store         - Zustand ストア
```

## よく使うコマンド

```bash
# Backend 開発サーバー起動
cd backend && npm run start:dev

# Frontend 開発サーバー起動
cd frontend && npm run dev

# テスト実行
cd backend && npm test
cd frontend && npm test

# カバレッジ付きテスト
cd backend && npm run test:cov
cd frontend && npm run test:coverage
```

## 技術的な発見

### 2025-02 SSL/TLS 設定の最適化

**問題**: ローカル開発環境とSupabase接続でSSL証明書エラーが発生

**解決策**: 環境別のSSL設定を実装
- 本番環境: SSL証明書検証を強制（無効化不可）
- 開発環境: `DB_SSL_REJECT_UNAUTHORIZED=false` で検証スキップ可能
- テスト環境: `ALLOW_INSECURE_TEST_DB=true` でSSL無効化可能

**ファイル**: `/backend/src/config/database.config.ts`

```typescript
// 環境別SSL設定の例
if (nodeEnv === 'production') {
  // 本番では必ず証明書検証
  return { rejectUnauthorized: true, ca?: loadedCert };
}
```

### 2025-02 マルチテナント対応

**実装**: ユーザーは複数組織に所属可能

**関連テーブル**:
- `user_profiles` - ユーザープロファイル
- `organizations` - 組織
- `organization_members` - 組織メンバーシップ

### 2025-02 Zustand 状態管理パターン

**リカバリーモードの状態遷移**:
```
[初期状態] → [認証チェック中]
              ↓
  ┌──────────┼──────────┐
  ↓          ↓          ↓
[RECOVERY] [SIGNED_IN] [SIGNED_OUT]
```

**重要ポイント**:
- `isRecoveryMode=true` の間は `isAuthenticated=false`
- パスワード更新後は `exitRecoveryMode()` → `logout()` の順で呼び出す
- localStorage で複数タブ間の同期を実装

**ファイル**: `/frontend/src/store/authStore.ts`

### 2025-02 Supabase Auth 移行

**変更点**:
- 独自JWT発行 → Supabase Auth に委譲
- `JWT_SECRET` → `SUPABASE_JWT_SECRET`
- セッション管理は Supabase SDK が担当

**認証フロー**:
1. フロントエンドで Supabase SDK を使用してログイン
2. Supabase から JWT トークン取得
3. バックエンドは `SUPABASE_JWT_SECRET` でトークン検証

## エラーハンドリングガイドライン

### 2026-02 カスタム例外体系

**推奨パターン**: NestJS標準例外の代わりにカスタム例外を使用

**例外クラス階層**:
```
BaseException
├── ResourceNotFoundException  ← リソース未発見
├── BusinessException          ← ビジネスロジック違反
├── ValidationException        ← バリデーションエラー
├── SystemException            ← システムエラー
└── ConflictException          ← リソース競合
```

**ファクトリメソッドの使用**:
```typescript
// ❌ 非推奨: NestJS標準例外
throw new NotFoundException(`Project with ID "${id}" not found`);

// ✅ 推奨: カスタム例外のファクトリメソッド
throw ResourceNotFoundException.forProject(id);
throw ResourceNotFoundException.forTask(taskId);
throw ResourceNotFoundException.forPartner(partnerId);
```

**エラーコード体系** (`/backend/src/common/exceptions/error-codes.ts`):
- `AUTH_xxx`: 認証・認可関連
- `USER_xxx`: ユーザー管理関連
- `PROJECT_xxx`: プロジェクト関連
- `TASK_xxx`: タスク関連
- `PARTNER_xxx`: パートナー関連
- `FILE_xxx`: ファイル管理関連
- `VALIDATION_xxx`: バリデーション関連
- `SYSTEM_xxx`: システム関連

**エラーレスポンス形式**:
```json
{
  "success": false,
  "error": {
    "code": "PROJECT_001",
    "message": "プロジェクトが見つかりません",
    "details": { "resourceType": "Project", "resourceId": "abc-123" }
  },
  "timestamp": "2026-02-03T...",
  "path": "/api/v1/projects/abc-123"
}
```

### セキュリティ修正 (2026-02)

**実施済み修正**:
1. SSL証明書検証を本番環境で有効化 (`rejectUnauthorized: true`)
2. `localStorage` → `sessionStorage` に変更 (XSS対策)
3. `RolesGuard` でデフォルト拒否を実装 (認証必須化)
4. `avatarUrl` に `@IsUrl()` バリデーション追加

---

## 解決した問題

### SSL証明書検証エラー (SELF_SIGNED_CERT_IN_CHAIN)

**原因**: ローカル開発環境でSupabaseへの接続時にSSL証明書が検証される

**解決**:
```bash
# .env で設定
DB_SSL_REJECT_UNAUTHORIZED=false
```

### テスト環境でのDB接続エラー

**原因**: テスト実行時にSSL接続が必要

**解決**:
```bash
# テスト用 .env で設定
NODE_ENV=test
ALLOW_INSECURE_TEST_DB=true
```

### パスワードリセット後の認証状態不整合

**原因**: リカバリーモード終了後にセッションが残存

**解決**: `exitRecoveryMode()` 単体ではなく、`logout()` も呼び出してセッションを完全にクリア

---
*最終更新: 2025-02-02*
*このファイルは Claude Code との対話で更新されます*
