# Task 5 評価レポート: エラーハンドリング体系の構築

## 【辛口評価】criticism-evaluator による厳しい検証

---

## 1. 新規性 (2/5点) - 再発明した車輪

### 問題点
- **標準化されたNestJS例外を無視**: `NotFoundException`, `BadRequestException`などはすでにNestJSが提供している仕様です
- **独自体系の過度な複雑化**: `BaseException`階層を作成したが、NestJSの`HttpException`を単に拡張しているだけで本質的な改善がない
- **エコシステムとの齟齢**: NestJSコミュニティの標準パターンに従わず、メンテナーの学習コストを増加

### 現状の使用パターン
```typescript
// 実際の使用（NestJS標準）171件
throw new NotFoundException('User not found');
throw new BadRequestException('Invalid input');
throw new ConflictException('Duplicate entry');

// カスタム例外の実際の使用（8件のみ）
// ほぼドキュメント内のコメント例示だけ
```

**評価**: 投資に対するリターンが低い。NestJS標準に統一すべき。

---

## 2. 具体性 (1/5点) - 抽象化しすぎて実装から乖離

### 問題点A: エラーコード体系の網羅性の欠落

#### AUTH（認証）ドメイン
```typescript
AUTH_001: '認証が必要です'         // OK
AUTH_002: 'トークンが無効'          // OK
AUTH_003: 'ログイン情報が正しくない'  // OK
AUTH_004: '操作権限がない'          // OK
AUTH_005: 'アカウント無効化'        // OK
AUTH_006: 'リフレッシュトークン無効' // OK
AUTH_007: 'セッション期限切れ'      // OK

❌ MISSING: パスワードリセットトークン無効
❌ MISSING: 多要素認証(MFA)失敗
❌ MISSING: セッション競合
❌ MISSING: トークンスコープ不足
❌ MISSING: IP制限違反
```

#### VALIDATION（バリデーション）ドメイン
```typescript
VALIDATION_001: '入力データが不正'    // 汎用すぎ
VALIDATION_002: '必須項目が空'       // OK
VALIDATION_003: '入力形式が不正'     // OK
VALIDATION_004: '値が許容範囲外'     // OK
VALIDATION_005: '文字数が上限超過'   // OK

❌ MISSING: 型チェック失敗（異なるドメインの共有）
❌ MISSING: 正規表現マッチ失敗
❌ MISSING: 相互参照制約違反
❌ MISSING: 日付範囲エラー（開始日>終了日）
```

#### PROJECT（プロジェクト）ドメイン
```typescript
PROJECT_001～PROJECT_008: 定義済み

❌ MISSING: プロジェクトテンプレート関連エラー
❌ MISSING: プロジェクト複製失敗
❌ MISSING: プロジェクトアーカイブ制約
❌ MISSING: 予算超過警告エラー化
```

#### TASK（タスク）ドメイン
```typescript
TASK_001～TASK_010: 定義済み

❌ MISSING: 親タスクステータス制約違反
❌ MISSING: 担当者がアクティブユーザーでない
❌ MISSING: リソース割り当て競合
❌ MISSING: 予定工数超過
❌ MISSING: タスク依存関係の無効化
```

#### FILE（ファイル）ドメイン
```typescript
FILE_001～FILE_006: 定義済み

❌ MISSING: ウイルススキャン失敗
❌ MISSING: スキャナ利用不可
❌ MISSING: ファイル名衝突
❌ MISSING: ストレージクォータ超過
❌ MISSING: メタデータ抽出失敗
```

#### PARTNER（パートナー）ドメイン
```typescript
PARTNER_001～PARTNER_007: 定義済み

❌ MISSING: パートナー企業認定保留
❌ MISSING: 与信調査中エラー
❌ MISSING: コンプライアンス審査失敗
❌ MISSING: パートナー企業名重複
❌ MISSING: 地域制限違反
```

### 問題点B: 代替案が複数存在するのに未列挙

```typescript
// VALIDATION_001は「入力データが不正」で汎用だが以下の区別がない
- スキーマ検証失敗
- 型強制失敗
- ビジネスルール検証失敗
- クロスフィールド検証失敗

// これらは実装パターンとしてまったく異なる
```

**評価**: エラーコード体系は見た目の「完成度」は高いが、実際の運用で発生する典型的なエラーケースを十分にカバーしていない。

---

## 3. 深さ (2/5点) - 根本原因の分析が浅い

### 問題点A: エラーハンドリングの層別設計が不在

#### 現状: 単層的アプローチ
```typescript
// HttpExceptionFilter ですべてを統一処理
if (exception instanceof BaseException) {
  // ここですべてのカスタム例外を処理
}
```

#### 不足している層別処理
```
1. バリデーション層
   - リクエストスキーマ検証エラー
   - DTOバリデーション失敗
   ⚠️ ValidationExceptionが汎用VALIDATION_001を使用

2. ビジネスロジック層
   - 業務ルール違反
   - 状態遷移エラー
   ⚠️ BusinessExceptionが汎用で、詳細エラーが区別されない

3. データアクセス層
   - DB制約違反
   - トランザクション失敗
   ⚠️ SystemExceptionだが、DBエラーの詳細分類がない

4. 外部連携層
   - API呼び出し失敗
   - タイムアウト
   - レート制限
   ⚠️ SYSTEM_003, SYSTEM_005, SYSTEM_006 だが細分化不足

5. 認証・認可層
   - トークン検証
   - スコープチェック
   - リソースアクセス権限
   ⚠️ AUTH エラーが認証・認可・セッション管理を混在
```

### 問題点B: エラーコンテキストの喪失

```typescript
// 現在のシステム
throw new ValidationException('VALIDATION_001', {
  fieldErrors: [
    { field: 'email', constraints: ['Invalid email'] }
  ]
});

// しかし以下の根本情報が喪失される
❌ 原因となった入力値
❌ 期待値との差分
❌ バリデーションルール定義の参照
❌ ユーザーの修正方法
❌ エラーの出現時刻（タイムスタンプなし）
```

### 問題点C: エラー復帰戦略の未定義

```typescript
// エラーコードはあるが、以下が不明確
❌ ユーザーが取るべき行動が不明
❌ 自動リトライが可能か否か
❌ リトライ間隔推奨値がない
❌ フォールバック戦略がない
❌ エスカレーション条件が未定義

例：
SYSTEM_006: 'レート制限に達しました' ← Retry-Afterヘッダーがない
SYSTEM_003: '外部サービス通信失敗' ← サーキットブレーカーパターンがない
SYSTEM_005: 'リクエストタイムアウト' ← 再試行回数上限がない
```

**評価**: エラーをキャッチして分類しているだけで、エラー発生後の**復帰経路**を全く設計していない。

---

## 4. 行動可能性 (2/5点) - すぐに修正できない「負債」

### 問題点A: 実装と設計の大きなギャップ

現状のコード検査結果:
```bash
# カスタム例外の実際の使用
BusinessException の使用:      0件
ResourceNotFoundException の使用: 0件
ValidationException の使用:      0件
SystemException の使用:          0件

# NestJS標準例外の使用
NotFoundException の使用:        ~~50件
BadRequestException の使用:      ~80件
ConflictException の使用:        ~20件
ForbiddenException の使用:       ~15件
UnauthorizedException の使用:    ~6件

✅ カスタム例外の実装完了率: 0%
```

**修正するには**:
- 全モジュール（15+ファイル）でエラー処理を置き換え
- テストケース（100+）の更新
- ドキュメント（API仕様）の更新
- チーム全体の学習

**実現性**: 低い。推奨エラーコード体系を学習しコード化するインセンティブがない。

### 問題点B: エラーコード体系の拡張が難しい

新しいエラーが発生した場合:

```typescript
// 1. error-codes.ts に新しいコード定義
// 2. 対応する例外クラスが既に存在するか確認
// 3. 既存の汎用例外クラスを使うか新しいクラスを作るか判断
// 4. http-exception.filter.ts を更新（必要に応じ）
// 5. モジュール内で実装
// 6. テスト追加
// 7. API ドキュメント更新

❌ 処理フローが複雑で誤りやすい
❌ ガイドラインがない（CLAUDE.mdにも記載なし）
❌ レビューが重くなる
```

### 問題点C: クライアント側の対応が不完全

エラーレスポンス形式:
```typescript
{
  success: false,
  error: {
    code: 'VALIDATION_001',      // ✅ クライアントが処理できる
    message: '入力データが不正です', // ✅ ユーザー向け
    details?: {                     // ✅ 詳細情報
      fieldErrors: [...]
    }
  },
  timestamp: '2025-02-02T...',
  path: '/api/v1/projects',
  method: 'POST'
}
```

しかし:
```typescript
❌ error.code に対応するクライアント処理が不明
❌ 自動再試行ロジックなし
❌ エラー国際化（i18n）サポートなし
❌ エラー追跡ID（requestId）との連携が不完全
❌ エラーログの集約戦略がない
```

**修正するには**:
- フロントエンド側のエラーハンドリングコンポーネント作成
- エラーメッセージ国際化ファイル作成
- エラー追跡システムの構築

**実現性**: 中程度。ただしタスク完了度が低いため優先度が下がりやすい。

---

## 5. 残存する根本的な問題点

### 問題点1: 例外体系とビジネスロジックの分離不足

```typescript
// 現状
throw new BusinessException('PROJECT_006', {
  message: 'プロジェクト名が重複しています'
});

// 問題
❌ ビジネスルール「プロジェクト名の一意性」がコード内に散在
❌ エラーコード体系と実装の対応関係が曖昧
❌ 新しいビジネスルール追加時のエラーコード割り当て手順がない
❌ レトロスペクティブ分析（どのエラーが多発するか）のためのコード体系がない
```

### 問題点2: エラーレベルと応答性能の未設計

```typescript
// HttpExceptionFilter の現在の動作
if (status >= 500) {
  logger.error(...);      // すべてのサーバーエラーを同じ優先度
} else if (status >= 400) {
  logger.warn(...);       // すべてのクライアントエラーを同じ優先度
}

// 不足している分別
❌ 致命的エラー (CRITICAL): システムダウン
❌ 重大エラー (MAJOR): 機能不可
❌ 中程度エラー (MEDIUM): 制限付き機能可
❌ 軽度エラー (MINOR): 警告のみ
❌ 情報 (INFO): リトライ推奨

例：
SYSTEM_002 (DB接続失敗) → CRITICAL（すぐに運用チーム通知）
FILE_003 (ファイルサイズ超過) → MINOR（ユーザー対応可）
SYSTEM_006 (レート制限) → MEDIUM（自動リトライ中）
```

### 問題点3: マルチテナント・マルチ言語対応の欠落

```typescript
// 現在のエラーメッセージ
'プロジェクトが見つかりません'  // 日本語固定

// 問題
❌ 言語別の翻訳メカニズムなし
❌ ロケール別のメッセージカスタマイズ不可
❌ マルチテナント環境でのエラーメッセージ調整不可
❌ ユーザーのプリファレンス設定に対応していない
```

### 問題点4: エラーメトリクスと監視の未設計

```typescript
// ログは出力されているが
logger.error(...);

// 不足している分析
❌ エラー発生率の追跡
❌ エラー種別別の分布
❌ 時間帯別のエラートレンド
❌ ユーザー別のエラー発生パターン
❌ エラーからの復帰成功率

実装すると以下が可能に:
- ✅ 「USER_002は1時間に100件発生している」
- ✅ 「FILE_003発生率が20%上昇（ストレージ逼迫）」
- ✅ 「AUTH系エラーが頻発（DDoS疑い）」
```

### 問題点5: エラーコードの重複・曖昧性

```typescript
以下の4つが区別されていない:

1. VALIDATION_001: '入力データが不正'
   - フォーム入力不正
   - API ペイロード不正
   - クエリパラメータ不正
   - ヘッダー検証失敗
   → 詳細が不明でクライアント側で対応不可

2. PROJECT_008: 'ステータス変更が無効'
   TASK_006: 'ステータス変更が無効'
   → 同じエラー分類が異なるコードで重複

3. SYSTEM_001: '汎用システムエラー'
   PROJECT_003～005: '作成/更新/削除失敗'
   TASK_003～005: '作成/更新/削除失敗'
   → 「失敗」は原因であってエラー分類ではない
```

---

## 6. 改善提案（具体的・段階的）

### フェーズ1: 現状把握と短期対応（1週間）

```typescript
// Step 1: 実装ギャップの可視化
const auditResult = {
  customExceptionsUsage: 0,     // 0件
  nestjsExceptionsUsage: 171,   // 171件
  gapPercentage: 100            // 100% 未実装
};

// Step 2: 実装優先度の決定
const priorityMatrix = {
  high: ['AUTH', 'VALIDATION', 'RESOURCE_NOT_FOUND'],
  medium: ['BUSINESS', 'CONFLICT'],
  low: ['NOTIFICATION']
};

// Step 3: 段階的移行計画
const migrationPlan = {
  week1: ['auth module への導入'],
  week2: ['project module への導入'],
  week3: ['task module への導入'],
  // ... 全14モジュールを計画
};
```

### フェーズ2: エラーコード体系の再構成（2週間）

```typescript
// 案: ドメイン×カテゴリマトリックス設計
interface ErrorCodeStructure {
  domain: 'AUTH' | 'USER' | 'PROJECT' | 'TASK' | 'PARTNER' | 'FILE' | 'SYSTEM';
  category:
    | 'NOT_FOUND'           // 404
    | 'UNAUTHORIZED'        // 401
    | 'FORBIDDEN'           // 403
    | 'CONFLICT'            // 409
    | 'VALIDATION_ERROR'    // 400
    | 'BUSINESS_RULE'       // 422
    | 'RATE_LIMIT'          // 429
    | 'SYSTEM_ERROR';       // 500+
  severity: 'CRITICAL' | 'MAJOR' | 'MEDIUM' | 'MINOR';
  retryable: boolean;
  userActionRequired: boolean;
}

// 新エラーコード形式の例
AUTH_UNAUTHORIZED_001 → 認証情報が提供されていない
AUTH_UNAUTHORIZED_002 → トークンが無効である
AUTH_UNAUTHORIZED_003 → トークンが期限切れである
AUTH_UNAUTHORIZED_004 → リフレッシュトークンが無効である

PROJECT_CONFLICT_001 → プロジェクト名が既に使用されている
PROJECT_CONFLICT_002 → プロジェクトIDが重複している
PROJECT_CONFLICT_003 → アーカイブ済みプロジェクト

TASK_BUSINESS_RULE_001 → 親タスクが見つからない
TASK_BUSINESS_RULE_002 → タスクに循環参照が存在する
TASK_BUSINESS_RULE_003 → 親タスクのステータスが完了済み
```

### フェーズ3: エラーハンドリング層の強化（3週間）

```typescript
// 層別エラーハンドラーの実装
class ValidationErrorHandler {
  // バリデーションレイヤー専用
  handle(errors: ValidationError[]): ValidationException {
    // フィールド単位の詳細分類
    // クライアント側で対応可能な形式に変換
  }
}

class BusinessRuleErrorHandler {
  // ビジネスロジックレイヤー専用
  handle(error: BusinessError): BusinessException {
    // ビジネスルール違反の詳細化
    // 推奨アクションの提示
  }
}

class DatabaseErrorHandler {
  // データアクセスレイヤー専用
  handle(error: QueryFailedError): SystemException {
    // DB制約違反の分類
    // ユーザー向けメッセージの生成
  }
}

class ExternalServiceErrorHandler {
  // 外部連携レイヤー専用
  handle(error: AxiosError): SystemException {
    // サーキットブレーカーパターン
    // リトライ戦略の適用
  }
}
```

### フェーズ4: クライアント側エラーハンドリング（2週間）

```typescript
// frontend/src/services/errorHandler.ts
const errorCodeToAction = {
  'AUTH_UNAUTHORIZED_001': {
    action: 'REDIRECT_TO_LOGIN',
    userMessage: 'ログインが必要です',
    autoRetry: false
  },
  'SYSTEM_006': {
    action: 'EXPONENTIAL_BACKOFF',
    userMessage: 'しばらく待ってから再試行してください',
    autoRetry: true,
    retryAfter: 5000
  },
  'VALIDATION_001': {
    action: 'DISPLAY_FIELD_ERRORS',
    userMessage: '入力内容を確認してください',
    autoRetry: false
  },
  'PROJECT_CONFLICT_001': {
    action: 'SUGGEST_ALTERNATIVE_NAME',
    userMessage: 'このプロジェクト名は既に使用されています',
    autoRetry: false
  }
};
```

### フェーズ5: モニタリング・アラート（1週間）

```typescript
// backend/src/common/services/error-analytics.service.ts
interface ErrorMetric {
  timestamp: Date;
  errorCode: string;
  domain: string;
  severity: string;
  httpStatus: number;
  userId?: string;
  resourceId?: string;
  recoveryAttempted: boolean;
  recoverySucceeded: boolean;
  durationMs: number;
}

// 監視対象パターン
const alertConditions = {
  'AUTH_UNAUTHORIZED_* increased 50% hourly': {
    severity: 'HIGH',
    action: 'INVESTIGATE_DDOS_ATTACK'
  },
  'SYSTEM_002 * 5 in 1min': {
    severity: 'CRITICAL',
    action: 'PAGE_DB_TEAM'
  },
  'VALIDATION_001 > 20% of all requests': {
    severity: 'MEDIUM',
    action: 'REVIEW_API_SCHEMA'
  },
  'SYSTEM_006 increased 3x vs baseline': {
    severity: 'MEDIUM',
    action: 'CHECK_RATE_LIMIT_CONFIG'
  }
};
```

---

## 7. スコアサマリー

| 評価項目 | スコア | 理由 |
|---------|--------|------|
| **新規性** | 2/5 | NestJS標準を再発明。本質的な改善なし |
| **具体性** | 1/5 | エラーコード網羅性が低く、代替案も未検討 |
| **深さ** | 2/5 | 分類は浅く、復帰戦略や層別設計がない |
| **行動可能性** | 2/5 | 実装ギャップ100%で、すぐに修正できない |
| **平均スコア** | **1.75/5** | **B-評価（改善の余地大）** |

---

## 8. 最終判定

### ✅ 良かった点
1. エラーレスポンス形式の統一（一貫性がある）
2. フィールドレベルのバリデーションエラー対応
3. ファクトリメソッドパターン（ResourceNotFoundException）
4. ログレベルの区別（ERROR vs WARN）

### ❌ 決定的な問題
1. **実装がない**: 全モジュールでNestJS標準例外のまま（0%適用率）
2. **設計が浅い**: エラーコード体系が不完全で運用に耐えない
3. **復帰戦略がない**: エラーキャッチ後の対応が未設計
4. **メンテナンス不可**: ガイドラインなく、誰もが異なるアプローチを取る可能性

### 🎯 推奨アクション

**今すぐ優先すべき**:
1. 実装ギャップを埋めるロードマップ作成（ALL文件数14）
2. エラーコード体系の根本的な再設計（ドメイン×カテゴリ）
3. チーム向けガイドライン作成（CLAUDE.md に記載）

**3ヶ月以内に**:
1. 全モジュールへの段階的導入
2. クライアント側のエラーハンドリング統一
3. エラー監視・アラート基盤の構築

**根本的な課題**: 「作られたシステム」が「使われていないシステム」に成り下がっている。技術的負債化する前に、実装を開始すべき。

---

## 📋 チェックリスト: 次のステップ

- [ ] エラーコード再設計ワークショップ開催
- [ ] 全モジュールのエラーハンドリング監査
- [ ] NestJS 標準例外からカスタム例外への段階的移行計画
- [ ] CLAUDE.md にエラー処理ガイドラインを追加
- [ ] フロントエンド側エラーハンドラー実装開始
- [ ] エラーメトリクス収集基盤の構築
- [ ] チーム全体への研修実施

---

**評価者**: criticism-evaluator Agent
**評価日**: 2025-02-02
**調査ファイル数**: 7
**実装状況**: 0/14 モジュール (0%)
