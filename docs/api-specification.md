# パートナー協業プラットフォーム REST API仕様書

## 概要

本ドキュメントは、パートナー協業プラットフォームのREST API仕様を定義します。

### 基本情報

| 項目 | 値 |
|------|-----|
| Base URL | `https://api.example.com/api` |
| API Version | v1 |
| Content-Type | `application/json` |
| 認証方式 | Bearer Token (JWT) |

### 共通ヘッダー

| ヘッダー名 | 必須 | 説明 |
|-----------|------|------|
| Authorization | Yes (認証必要なエンドポイント) | `Bearer {token}` |
| Content-Type | Yes (リクエストボディがある場合) | `application/json` |
| Accept | No | `application/json` |

---

## 共通仕様

### ページネーション

一覧取得APIでは、以下のクエリパラメータでページネーションを制御します。

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| limit | integer | 20 | 取得件数（最大100） |
| offset | integer | 0 | 取得開始位置 |

**レスポンス形式:**

```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### エラーレスポンス

全てのエラーレスポンスは以下の統一フォーマットに従います。

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": [
      {
        "field": "フィールド名",
        "message": "詳細メッセージ"
      }
    ]
  }
}
```

### HTTPステータスコード

| コード | 説明 |
|--------|------|
| 200 | OK - リクエスト成功 |
| 201 | Created - リソース作成成功 |
| 204 | No Content - 削除成功 |
| 400 | Bad Request - リクエスト不正 |
| 401 | Unauthorized - 認証エラー |
| 403 | Forbidden - 権限エラー |
| 404 | Not Found - リソース未検出 |
| 409 | Conflict - 競合エラー |
| 422 | Unprocessable Entity - バリデーションエラー |
| 500 | Internal Server Error - サーバーエラー |

### 共通エラーコード

| コード | 説明 |
|--------|------|
| UNAUTHORIZED | 認証が必要です |
| FORBIDDEN | アクセス権限がありません |
| NOT_FOUND | リソースが見つかりません |
| VALIDATION_ERROR | 入力値が不正です |
| DUPLICATE_ENTRY | 重複するデータが存在します |
| INTERNAL_ERROR | サーバー内部エラー |

---

## 認証API

### POST /api/auth/login

ユーザー認証を行い、アクセストークンを取得します。

**リクエスト:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| email | string | Yes | メールアドレス |
| password | string | Yes | パスワード |

**レスポンス (200 OK):**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "user": {
      "id": "usr_123456",
      "email": "user@example.com",
      "name": "山田 太郎",
      "role": "manager"
    }
  }
}
```

**エラーレスポンス (401 Unauthorized):**

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "メールアドレスまたはパスワードが正しくありません"
  }
}
```

---

### POST /api/auth/logout

現在のセッションをログアウトします。

**リクエストヘッダー:**

```
Authorization: Bearer {accessToken}
```

**レスポンス (204 No Content):**

レスポンスボディなし

---

### GET /api/auth/me

現在ログイン中のユーザー情報を取得します。

**リクエストヘッダー:**

```
Authorization: Bearer {accessToken}
```

**レスポンス (200 OK):**

```json
{
  "data": {
    "id": "usr_123456",
    "email": "user@example.com",
    "name": "山田 太郎",
    "role": "manager",
    "department": "営業部",
    "partnerId": null,
    "permissions": [
      "projects.read",
      "projects.write",
      "partners.read",
      "tasks.read",
      "tasks.write"
    ],
    "createdAt": "2025-01-15T09:00:00Z",
    "updatedAt": "2025-01-18T14:30:00Z"
  }
}
```

---

## 案件管理API

### GET /api/projects

案件一覧を取得します。フィルタリング、ページネーションに対応しています。

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| limit | integer | No | 取得件数（デフォルト: 20、最大: 100） |
| offset | integer | No | 取得開始位置（デフォルト: 0） |
| status | string | No | ステータスでフィルタ（draft, active, completed, archived） |
| partnerId | string | No | パートナーIDでフィルタ |
| managerId | string | No | 担当マネージャーIDでフィルタ |
| search | string | No | 案件名・説明での検索 |
| startDateFrom | string | No | 開始日（以降）でフィルタ（ISO 8601形式） |
| startDateTo | string | No | 開始日（以前）でフィルタ（ISO 8601形式） |
| sortBy | string | No | ソート項目（createdAt, updatedAt, startDate, name） |
| sortOrder | string | No | ソート順（asc, desc）デフォルト: desc |

**レスポンス (200 OK):**

```json
{
  "data": [
    {
      "id": "prj_001",
      "name": "ECサイトリニューアル",
      "description": "既存ECサイトのUI/UXリニューアルプロジェクト",
      "status": "active",
      "priority": "high",
      "startDate": "2025-02-01",
      "endDate": "2025-06-30",
      "budget": 5000000,
      "partner": {
        "id": "ptn_001",
        "name": "株式会社パートナーA"
      },
      "manager": {
        "id": "usr_123456",
        "name": "山田 太郎"
      },
      "progress": 35,
      "taskSummary": {
        "total": 24,
        "completed": 8,
        "inProgress": 5,
        "pending": 11
      },
      "createdAt": "2025-01-15T09:00:00Z",
      "updatedAt": "2025-01-18T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### GET /api/projects/:id

指定した案件の詳細情報を取得します。

**パスパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | Yes | 案件ID |

**レスポンス (200 OK):**

```json
{
  "data": {
    "id": "prj_001",
    "name": "ECサイトリニューアル",
    "description": "既存ECサイトのUI/UXリニューアルプロジェクト。モバイルファーストで設計し、コンバージョン率20%向上を目指す。",
    "status": "active",
    "priority": "high",
    "startDate": "2025-02-01",
    "endDate": "2025-06-30",
    "budget": 5000000,
    "actualCost": 1750000,
    "partner": {
      "id": "ptn_001",
      "name": "株式会社パートナーA",
      "contactPerson": "佐藤 花子",
      "email": "sato@partner-a.co.jp"
    },
    "manager": {
      "id": "usr_123456",
      "name": "山田 太郎",
      "email": "yamada@example.com"
    },
    "members": [
      {
        "id": "usr_234567",
        "name": "鈴木 一郎",
        "role": "developer"
      }
    ],
    "progress": 35,
    "taskSummary": {
      "total": 24,
      "completed": 8,
      "inProgress": 5,
      "pending": 11,
      "overdue": 2
    },
    "milestones": [
      {
        "id": "mls_001",
        "name": "デザイン完了",
        "dueDate": "2025-03-15",
        "status": "completed"
      },
      {
        "id": "mls_002",
        "name": "開発フェーズ1完了",
        "dueDate": "2025-04-30",
        "status": "in_progress"
      }
    ],
    "tags": ["EC", "リニューアル", "UI/UX"],
    "attachments": [
      {
        "id": "att_001",
        "name": "要件定義書.pdf",
        "size": 2048576,
        "mimeType": "application/pdf",
        "uploadedAt": "2025-01-16T10:00:00Z"
      }
    ],
    "createdAt": "2025-01-15T09:00:00Z",
    "updatedAt": "2025-01-18T14:30:00Z"
  }
}
```

**エラーレスポンス (404 Not Found):**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "指定された案件が見つかりません"
  }
}
```

---

### POST /api/projects

新規案件を作成します。

**リクエスト:**

```json
{
  "name": "新規Webアプリ開発",
  "description": "業務効率化のための社内Webアプリケーション開発",
  "status": "draft",
  "priority": "medium",
  "startDate": "2025-03-01",
  "endDate": "2025-08-31",
  "budget": 8000000,
  "partnerId": "ptn_002",
  "managerId": "usr_123456",
  "memberIds": ["usr_234567", "usr_345678"],
  "tags": ["Web", "社内システム"]
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| name | string | Yes | 案件名（最大100文字） |
| description | string | No | 案件説明（最大2000文字） |
| status | string | No | ステータス（draft, active）デフォルト: draft |
| priority | string | No | 優先度（low, medium, high）デフォルト: medium |
| startDate | string | Yes | 開始日（YYYY-MM-DD形式） |
| endDate | string | Yes | 終了日（YYYY-MM-DD形式） |
| budget | integer | No | 予算（円） |
| partnerId | string | Yes | 担当パートナーID |
| managerId | string | Yes | 担当マネージャーID |
| memberIds | array | No | メンバーIDの配列 |
| tags | array | No | タグの配列 |

**レスポンス (201 Created):**

```json
{
  "data": {
    "id": "prj_002",
    "name": "新規Webアプリ開発",
    "description": "業務効率化のための社内Webアプリケーション開発",
    "status": "draft",
    "priority": "medium",
    "startDate": "2025-03-01",
    "endDate": "2025-08-31",
    "budget": 8000000,
    "actualCost": 0,
    "partner": {
      "id": "ptn_002",
      "name": "株式会社パートナーB"
    },
    "manager": {
      "id": "usr_123456",
      "name": "山田 太郎"
    },
    "members": [
      {
        "id": "usr_234567",
        "name": "鈴木 一郎"
      }
    ],
    "progress": 0,
    "tags": ["Web", "社内システム"],
    "createdAt": "2025-01-19T10:00:00Z",
    "updatedAt": "2025-01-19T10:00:00Z"
  }
}
```

**エラーレスポンス (422 Unprocessable Entity):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": [
      {
        "field": "endDate",
        "message": "終了日は開始日より後の日付を指定してください"
      }
    ]
  }
}
```

---

### PUT /api/projects/:id

既存の案件を更新します。

**パスパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | Yes | 案件ID |

**リクエスト:**

```json
{
  "name": "ECサイトリニューアル（更新）",
  "description": "更新された説明文",
  "status": "active",
  "priority": "high",
  "endDate": "2025-07-31",
  "budget": 6000000
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| name | string | No | 案件名（最大100文字） |
| description | string | No | 案件説明（最大2000文字） |
| status | string | No | ステータス（draft, active, completed, archived） |
| priority | string | No | 優先度（low, medium, high） |
| startDate | string | No | 開始日（YYYY-MM-DD形式） |
| endDate | string | No | 終了日（YYYY-MM-DD形式） |
| budget | integer | No | 予算（円） |
| partnerId | string | No | 担当パートナーID |
| managerId | string | No | 担当マネージャーID |
| memberIds | array | No | メンバーIDの配列 |
| tags | array | No | タグの配列 |

**レスポンス (200 OK):**

```json
{
  "data": {
    "id": "prj_001",
    "name": "ECサイトリニューアル（更新）",
    "description": "更新された説明文",
    "status": "active",
    "priority": "high",
    "startDate": "2025-02-01",
    "endDate": "2025-07-31",
    "budget": 6000000,
    "actualCost": 1750000,
    "partner": {
      "id": "ptn_001",
      "name": "株式会社パートナーA"
    },
    "manager": {
      "id": "usr_123456",
      "name": "山田 太郎"
    },
    "progress": 35,
    "tags": ["EC", "リニューアル", "UI/UX"],
    "createdAt": "2025-01-15T09:00:00Z",
    "updatedAt": "2025-01-19T11:00:00Z"
  }
}
```

---

### DELETE /api/projects/:id

案件を削除します（論理削除）。

**パスパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | Yes | 案件ID |

**レスポンス (204 No Content):**

レスポンスボディなし

**エラーレスポンス (409 Conflict):**

```json
{
  "error": {
    "code": "HAS_ACTIVE_TASKS",
    "message": "進行中のタスクがあるため削除できません"
  }
}
```

---

## タスク管理API

### GET /api/projects/:projectId/tasks

指定した案件のタスク一覧を取得します。

**パスパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| projectId | string | Yes | 案件ID |

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| limit | integer | No | 取得件数（デフォルト: 20、最大: 100） |
| offset | integer | No | 取得開始位置（デフォルト: 0） |
| status | string | No | ステータスでフィルタ（pending, in_progress, review, completed） |
| assigneeId | string | No | 担当者IDでフィルタ |
| priority | string | No | 優先度でフィルタ（low, medium, high） |
| dueDateFrom | string | No | 期限日（以降）でフィルタ |
| dueDateTo | string | No | 期限日（以前）でフィルタ |
| isOverdue | boolean | No | 期限超過タスクのみ取得 |
| sortBy | string | No | ソート項目（createdAt, dueDate, priority） |
| sortOrder | string | No | ソート順（asc, desc） |

**レスポンス (200 OK):**

```json
{
  "data": [
    {
      "id": "tsk_001",
      "projectId": "prj_001",
      "title": "デザインカンプ作成",
      "description": "トップページとカテゴリページのデザインカンプを作成",
      "status": "completed",
      "priority": "high",
      "dueDate": "2025-02-15",
      "estimatedHours": 40,
      "actualHours": 38,
      "assignee": {
        "id": "usr_234567",
        "name": "鈴木 一郎"
      },
      "tags": ["デザイン", "UI"],
      "isOverdue": false,
      "completedAt": "2025-02-14T17:00:00Z",
      "createdAt": "2025-01-20T09:00:00Z",
      "updatedAt": "2025-02-14T17:00:00Z"
    },
    {
      "id": "tsk_002",
      "projectId": "prj_001",
      "title": "フロントエンド実装",
      "description": "React + TypeScriptでフロントエンドを実装",
      "status": "in_progress",
      "priority": "high",
      "dueDate": "2025-03-31",
      "estimatedHours": 120,
      "actualHours": 45,
      "assignee": {
        "id": "usr_345678",
        "name": "高橋 次郎"
      },
      "tags": ["開発", "フロントエンド"],
      "isOverdue": false,
      "completedAt": null,
      "createdAt": "2025-02-01T09:00:00Z",
      "updatedAt": "2025-02-18T14:00:00Z"
    }
  ],
  "pagination": {
    "total": 24,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### POST /api/projects/:projectId/tasks

新規タスクを作成します。

**パスパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| projectId | string | Yes | 案件ID |

**リクエスト:**

```json
{
  "title": "API設計書作成",
  "description": "REST APIの詳細設計書を作成する",
  "status": "pending",
  "priority": "medium",
  "dueDate": "2025-02-28",
  "estimatedHours": 16,
  "assigneeId": "usr_234567",
  "tags": ["設計", "ドキュメント"]
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| title | string | Yes | タスク名（最大200文字） |
| description | string | No | タスク説明（最大4000文字） |
| status | string | No | ステータス（pending, in_progress）デフォルト: pending |
| priority | string | No | 優先度（low, medium, high）デフォルト: medium |
| dueDate | string | Yes | 期限日（YYYY-MM-DD形式） |
| estimatedHours | integer | No | 見積工数（時間） |
| assigneeId | string | No | 担当者ID |
| tags | array | No | タグの配列 |

**レスポンス (201 Created):**

```json
{
  "data": {
    "id": "tsk_003",
    "projectId": "prj_001",
    "title": "API設計書作成",
    "description": "REST APIの詳細設計書を作成する",
    "status": "pending",
    "priority": "medium",
    "dueDate": "2025-02-28",
    "estimatedHours": 16,
    "actualHours": 0,
    "assignee": {
      "id": "usr_234567",
      "name": "鈴木 一郎"
    },
    "tags": ["設計", "ドキュメント"],
    "isOverdue": false,
    "completedAt": null,
    "createdAt": "2025-01-19T10:00:00Z",
    "updatedAt": "2025-01-19T10:00:00Z"
  }
}
```

---

### PUT /api/tasks/:id

既存のタスクを更新します。

**パスパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | Yes | タスクID |

**リクエスト:**

```json
{
  "title": "API設計書作成（更新）",
  "status": "in_progress",
  "actualHours": 8
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| title | string | No | タスク名（最大200文字） |
| description | string | No | タスク説明（最大4000文字） |
| status | string | No | ステータス（pending, in_progress, review, completed） |
| priority | string | No | 優先度（low, medium, high） |
| dueDate | string | No | 期限日（YYYY-MM-DD形式） |
| estimatedHours | integer | No | 見積工数（時間） |
| actualHours | integer | No | 実績工数（時間） |
| assigneeId | string | No | 担当者ID |
| tags | array | No | タグの配列 |

**レスポンス (200 OK):**

```json
{
  "data": {
    "id": "tsk_003",
    "projectId": "prj_001",
    "title": "API設計書作成（更新）",
    "description": "REST APIの詳細設計書を作成する",
    "status": "in_progress",
    "priority": "medium",
    "dueDate": "2025-02-28",
    "estimatedHours": 16,
    "actualHours": 8,
    "assignee": {
      "id": "usr_234567",
      "name": "鈴木 一郎"
    },
    "tags": ["設計", "ドキュメント"],
    "isOverdue": false,
    "completedAt": null,
    "createdAt": "2025-01-19T10:00:00Z",
    "updatedAt": "2025-01-19T14:00:00Z"
  }
}
```

---

### DELETE /api/tasks/:id

タスクを削除します。

**パスパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | Yes | タスクID |

**レスポンス (204 No Content):**

レスポンスボディなし

---

## パートナー管理API

### GET /api/partners

パートナー一覧を取得します。

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| limit | integer | No | 取得件数（デフォルト: 20、最大: 100） |
| offset | integer | No | 取得開始位置（デフォルト: 0） |
| status | string | No | ステータスでフィルタ（active, inactive, pending） |
| search | string | No | 会社名・担当者名での検索 |
| industry | string | No | 業種でフィルタ |
| rating | integer | No | 評価（1-5）以上でフィルタ |
| sortBy | string | No | ソート項目（createdAt, name, rating） |
| sortOrder | string | No | ソート順（asc, desc） |

**レスポンス (200 OK):**

```json
{
  "data": [
    {
      "id": "ptn_001",
      "name": "株式会社パートナーA",
      "industry": "IT・ソフトウェア",
      "status": "active",
      "contactPerson": "佐藤 花子",
      "email": "sato@partner-a.co.jp",
      "phone": "03-1234-5678",
      "rating": 4.5,
      "totalProjects": 12,
      "activeProjects": 3,
      "contractStartDate": "2023-04-01",
      "createdAt": "2023-03-15T09:00:00Z",
      "updatedAt": "2025-01-10T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 28,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### GET /api/partners/:id

指定したパートナーの詳細情報を取得します。

**パスパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | Yes | パートナーID |

**レスポンス (200 OK):**

```json
{
  "data": {
    "id": "ptn_001",
    "name": "株式会社パートナーA",
    "industry": "IT・ソフトウェア",
    "status": "active",
    "description": "Webアプリケーション開発を得意とするパートナー企業",
    "address": {
      "postalCode": "100-0001",
      "prefecture": "東京都",
      "city": "千代田区",
      "street": "丸の内1-1-1",
      "building": "丸の内ビル5F"
    },
    "contactPerson": "佐藤 花子",
    "email": "sato@partner-a.co.jp",
    "phone": "03-1234-5678",
    "website": "https://partner-a.co.jp",
    "rating": 4.5,
    "skills": ["React", "Node.js", "AWS", "TypeScript"],
    "certifications": ["AWS認定ソリューションアーキテクト", "PMP"],
    "contractInfo": {
      "contractStartDate": "2023-04-01",
      "contractEndDate": "2026-03-31",
      "contractType": "年間契約",
      "paymentTerms": "月末締め翌月末払い"
    },
    "statistics": {
      "totalProjects": 12,
      "activeProjects": 3,
      "completedProjects": 9,
      "averageProjectDuration": 120,
      "onTimeDeliveryRate": 92.5
    },
    "recentProjects": [
      {
        "id": "prj_001",
        "name": "ECサイトリニューアル",
        "status": "active"
      }
    ],
    "notes": "品質が高く、コミュニケーションも円滑",
    "createdAt": "2023-03-15T09:00:00Z",
    "updatedAt": "2025-01-10T14:30:00Z"
  }
}
```

---

### POST /api/partners

新規パートナーを登録します。

**リクエスト:**

```json
{
  "name": "株式会社パートナーC",
  "industry": "デザイン",
  "status": "pending",
  "description": "UI/UXデザインを専門とする企業",
  "address": {
    "postalCode": "150-0001",
    "prefecture": "東京都",
    "city": "渋谷区",
    "street": "神宮前1-1-1"
  },
  "contactPerson": "田中 美咲",
  "email": "tanaka@partner-c.co.jp",
  "phone": "03-9876-5432",
  "website": "https://partner-c.co.jp",
  "skills": ["Figma", "Adobe XD", "Illustrator"],
  "contractInfo": {
    "contractStartDate": "2025-02-01",
    "contractEndDate": "2026-01-31",
    "contractType": "年間契約",
    "paymentTerms": "月末締め翌月末払い"
  }
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| name | string | Yes | 会社名（最大100文字） |
| industry | string | Yes | 業種 |
| status | string | No | ステータス（pending, active）デフォルト: pending |
| description | string | No | 会社説明（最大2000文字） |
| address | object | No | 住所情報 |
| contactPerson | string | Yes | 担当者名 |
| email | string | Yes | メールアドレス |
| phone | string | No | 電話番号 |
| website | string | No | WebサイトURL |
| skills | array | No | スキル・技術の配列 |
| certifications | array | No | 資格・認定の配列 |
| contractInfo | object | No | 契約情報 |
| notes | string | No | 備考 |

**レスポンス (201 Created):**

```json
{
  "data": {
    "id": "ptn_003",
    "name": "株式会社パートナーC",
    "industry": "デザイン",
    "status": "pending",
    "contactPerson": "田中 美咲",
    "email": "tanaka@partner-c.co.jp",
    "phone": "03-9876-5432",
    "rating": null,
    "totalProjects": 0,
    "activeProjects": 0,
    "createdAt": "2025-01-19T10:00:00Z",
    "updatedAt": "2025-01-19T10:00:00Z"
  }
}
```

---

### PUT /api/partners/:id

既存のパートナー情報を更新します。

**パスパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | Yes | パートナーID |

**リクエスト:**

```json
{
  "status": "active",
  "rating": 4.0,
  "notes": "契約承認完了。初回案件をアサイン予定。"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| name | string | No | 会社名 |
| industry | string | No | 業種 |
| status | string | No | ステータス（pending, active, inactive） |
| description | string | No | 会社説明 |
| address | object | No | 住所情報 |
| contactPerson | string | No | 担当者名 |
| email | string | No | メールアドレス |
| phone | string | No | 電話番号 |
| website | string | No | WebサイトURL |
| skills | array | No | スキル・技術の配列 |
| certifications | array | No | 資格・認定の配列 |
| contractInfo | object | No | 契約情報 |
| rating | number | No | 評価（1.0-5.0） |
| notes | string | No | 備考 |

**レスポンス (200 OK):**

```json
{
  "data": {
    "id": "ptn_003",
    "name": "株式会社パートナーC",
    "industry": "デザイン",
    "status": "active",
    "contactPerson": "田中 美咲",
    "email": "tanaka@partner-c.co.jp",
    "phone": "03-9876-5432",
    "rating": 4.0,
    "notes": "契約承認完了。初回案件をアサイン予定。",
    "totalProjects": 0,
    "activeProjects": 0,
    "createdAt": "2025-01-19T10:00:00Z",
    "updatedAt": "2025-01-19T15:00:00Z"
  }
}
```

---

## ダッシュボードAPI

### GET /api/dashboard/my-today

ログインユーザーの今日のタスクとアラートを取得します。

**レスポンス (200 OK):**

```json
{
  "data": {
    "date": "2025-01-19",
    "user": {
      "id": "usr_123456",
      "name": "山田 太郎"
    },
    "summary": {
      "totalTasks": 8,
      "completedTasks": 3,
      "inProgressTasks": 2,
      "pendingTasks": 3,
      "overdueTasks": 1
    },
    "todayTasks": [
      {
        "id": "tsk_010",
        "projectId": "prj_001",
        "projectName": "ECサイトリニューアル",
        "title": "デザインレビュー対応",
        "priority": "high",
        "status": "in_progress",
        "dueDate": "2025-01-19",
        "isOverdue": false
      },
      {
        "id": "tsk_011",
        "projectId": "prj_002",
        "projectName": "新規Webアプリ開発",
        "title": "要件ヒアリング準備",
        "priority": "medium",
        "status": "pending",
        "dueDate": "2025-01-19",
        "isOverdue": false
      }
    ],
    "overdueTasks": [
      {
        "id": "tsk_008",
        "projectId": "prj_001",
        "projectName": "ECサイトリニューアル",
        "title": "テスト仕様書作成",
        "priority": "medium",
        "status": "in_progress",
        "dueDate": "2025-01-17",
        "daysOverdue": 2
      }
    ],
    "alerts": [
      {
        "id": "alt_001",
        "type": "task_overdue",
        "severity": "high",
        "message": "タスク「テスト仕様書作成」が期限を2日超過しています",
        "relatedId": "tsk_008",
        "createdAt": "2025-01-18T00:00:00Z"
      },
      {
        "id": "alt_002",
        "type": "project_milestone",
        "severity": "medium",
        "message": "案件「ECサイトリニューアル」のマイルストーン「開発フェーズ1完了」が3日後に期限を迎えます",
        "relatedId": "prj_001",
        "createdAt": "2025-01-19T00:00:00Z"
      }
    ],
    "upcomingMeetings": [
      {
        "id": "mtg_001",
        "title": "週次進捗会議",
        "startTime": "2025-01-19T10:00:00Z",
        "endTime": "2025-01-19T11:00:00Z",
        "projectId": "prj_001",
        "projectName": "ECサイトリニューアル"
      }
    ]
  }
}
```

---

### GET /api/dashboard/manager

マネージャー向けダッシュボード情報を取得します。

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| period | string | No | 集計期間（week, month, quarter）デフォルト: month |

**レスポンス (200 OK):**

```json
{
  "data": {
    "period": "month",
    "periodStart": "2025-01-01",
    "periodEnd": "2025-01-31",
    "projectSummary": {
      "total": 15,
      "active": 8,
      "completed": 5,
      "delayed": 2,
      "onTrack": 6,
      "atRisk": 2
    },
    "taskSummary": {
      "total": 156,
      "completed": 89,
      "inProgress": 34,
      "pending": 28,
      "overdue": 5,
      "completionRate": 57.1
    },
    "partnerPerformance": [
      {
        "partnerId": "ptn_001",
        "partnerName": "株式会社パートナーA",
        "activeProjects": 3,
        "tasksCompleted": 24,
        "tasksTotal": 32,
        "onTimeDeliveryRate": 91.7,
        "rating": 4.5
      },
      {
        "partnerId": "ptn_002",
        "partnerName": "株式会社パートナーB",
        "activeProjects": 2,
        "tasksCompleted": 18,
        "tasksTotal": 25,
        "onTimeDeliveryRate": 88.9,
        "rating": 4.2
      }
    ],
    "projectsAtRisk": [
      {
        "id": "prj_003",
        "name": "基幹システム刷新",
        "status": "active",
        "progress": 45,
        "daysRemaining": 15,
        "overdueTaskCount": 3,
        "riskLevel": "high",
        "riskReasons": [
          "期限超過タスクが3件あります",
          "進捗率が予定より20%遅れています"
        ]
      }
    ],
    "recentActivities": [
      {
        "id": "act_001",
        "type": "task_completed",
        "description": "タスク「API設計書作成」が完了しました",
        "projectId": "prj_001",
        "projectName": "ECサイトリニューアル",
        "userId": "usr_234567",
        "userName": "鈴木 一郎",
        "createdAt": "2025-01-19T09:30:00Z"
      }
    ],
    "budgetOverview": {
      "totalBudget": 45000000,
      "totalSpent": 18500000,
      "utilizationRate": 41.1,
      "projectBudgets": [
        {
          "projectId": "prj_001",
          "projectName": "ECサイトリニューアル",
          "budget": 5000000,
          "spent": 1750000,
          "utilizationRate": 35.0
        }
      ]
    },
    "upcomingDeadlines": [
      {
        "type": "milestone",
        "projectId": "prj_001",
        "projectName": "ECサイトリニューアル",
        "title": "開発フェーズ1完了",
        "dueDate": "2025-01-22",
        "daysRemaining": 3
      },
      {
        "type": "project",
        "projectId": "prj_004",
        "projectName": "マーケティングサイト構築",
        "title": "プロジェクト完了",
        "dueDate": "2025-01-31",
        "daysRemaining": 12
      }
    ]
  }
}
```

---

## リマインドAPI

### GET /api/reminders

リマインド設定一覧を取得します。

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| limit | integer | No | 取得件数（デフォルト: 20、最大: 100） |
| offset | integer | No | 取得開始位置（デフォルト: 0） |
| isActive | boolean | No | 有効なリマインドのみ取得 |
| type | string | No | タイプでフィルタ（task, project, custom） |

**レスポンス (200 OK):**

```json
{
  "data": [
    {
      "id": "rmd_001",
      "type": "task",
      "title": "タスク期限リマインド",
      "description": "タスクの期限1日前に通知",
      "isActive": true,
      "triggerCondition": {
        "event": "task_due",
        "offsetDays": -1,
        "offsetHours": 0
      },
      "notificationChannels": ["email", "in_app"],
      "targetUsers": ["assignee"],
      "relatedProjectId": null,
      "relatedTaskId": null,
      "schedule": null,
      "lastTriggeredAt": "2025-01-18T09:00:00Z",
      "nextTriggerAt": "2025-01-19T09:00:00Z",
      "createdBy": {
        "id": "usr_123456",
        "name": "山田 太郎"
      },
      "createdAt": "2025-01-10T10:00:00Z",
      "updatedAt": "2025-01-18T09:00:00Z"
    },
    {
      "id": "rmd_002",
      "type": "project",
      "title": "週次進捗レポートリマインド",
      "description": "毎週金曜日に進捗レポート提出を促す",
      "isActive": true,
      "triggerCondition": null,
      "notificationChannels": ["email"],
      "targetUsers": ["manager"],
      "relatedProjectId": "prj_001",
      "relatedTaskId": null,
      "schedule": {
        "type": "weekly",
        "dayOfWeek": 5,
        "time": "09:00"
      },
      "lastTriggeredAt": "2025-01-17T09:00:00Z",
      "nextTriggerAt": "2025-01-24T09:00:00Z",
      "createdBy": {
        "id": "usr_123456",
        "name": "山田 太郎"
      },
      "createdAt": "2025-01-05T10:00:00Z",
      "updatedAt": "2025-01-17T09:00:00Z"
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### POST /api/reminders

新規リマインド設定を作成します。

**リクエスト:**

```json
{
  "type": "task",
  "title": "重要タスク期限アラート",
  "description": "高優先度タスクの期限3日前に通知",
  "isActive": true,
  "triggerCondition": {
    "event": "task_due",
    "offsetDays": -3,
    "offsetHours": 0,
    "filter": {
      "priority": "high"
    }
  },
  "notificationChannels": ["email", "in_app", "slack"],
  "targetUsers": ["assignee", "manager"]
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| type | string | Yes | リマインドタイプ（task, project, custom） |
| title | string | Yes | リマインドタイトル（最大100文字） |
| description | string | No | 説明（最大500文字） |
| isActive | boolean | No | 有効フラグ（デフォルト: true） |
| triggerCondition | object | Yes* | トリガー条件（イベントベース時） |
| notificationChannels | array | Yes | 通知チャネル（email, in_app, slack） |
| targetUsers | array | Yes | 通知対象（assignee, manager, all_members） |
| relatedProjectId | string | No | 関連案件ID（特定案件に限定する場合） |
| relatedTaskId | string | No | 関連タスクID（特定タスクに限定する場合） |
| schedule | object | No | スケジュール設定（定期実行時） |

**triggerCondition オブジェクト:**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| event | string | イベントタイプ（task_due, project_end, milestone_due） |
| offsetDays | integer | オフセット日数（負数で前、正数で後） |
| offsetHours | integer | オフセット時間 |
| filter | object | フィルタ条件 |

**schedule オブジェクト:**

| フィールド | 型 | 説明 |
|-----------|-----|------|
| type | string | スケジュールタイプ（daily, weekly, monthly） |
| dayOfWeek | integer | 曜日（0-6、週次の場合） |
| dayOfMonth | integer | 日（1-31、月次の場合） |
| time | string | 時刻（HH:mm形式） |

**レスポンス (201 Created):**

```json
{
  "data": {
    "id": "rmd_003",
    "type": "task",
    "title": "重要タスク期限アラート",
    "description": "高優先度タスクの期限3日前に通知",
    "isActive": true,
    "triggerCondition": {
      "event": "task_due",
      "offsetDays": -3,
      "offsetHours": 0,
      "filter": {
        "priority": "high"
      }
    },
    "notificationChannels": ["email", "in_app", "slack"],
    "targetUsers": ["assignee", "manager"],
    "relatedProjectId": null,
    "relatedTaskId": null,
    "schedule": null,
    "lastTriggeredAt": null,
    "nextTriggerAt": "2025-01-22T09:00:00Z",
    "createdBy": {
      "id": "usr_123456",
      "name": "山田 太郎"
    },
    "createdAt": "2025-01-19T10:00:00Z",
    "updatedAt": "2025-01-19T10:00:00Z"
  }
}
```

---

### PUT /api/reminders/:id

既存のリマインド設定を更新します。

**パスパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | Yes | リマインドID |

**リクエスト:**

```json
{
  "isActive": false,
  "notificationChannels": ["email"]
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| title | string | No | リマインドタイトル |
| description | string | No | 説明 |
| isActive | boolean | No | 有効フラグ |
| triggerCondition | object | No | トリガー条件 |
| notificationChannels | array | No | 通知チャネル |
| targetUsers | array | No | 通知対象 |
| schedule | object | No | スケジュール設定 |

**レスポンス (200 OK):**

```json
{
  "data": {
    "id": "rmd_003",
    "type": "task",
    "title": "重要タスク期限アラート",
    "description": "高優先度タスクの期限3日前に通知",
    "isActive": false,
    "triggerCondition": {
      "event": "task_due",
      "offsetDays": -3,
      "offsetHours": 0,
      "filter": {
        "priority": "high"
      }
    },
    "notificationChannels": ["email"],
    "targetUsers": ["assignee", "manager"],
    "relatedProjectId": null,
    "relatedTaskId": null,
    "schedule": null,
    "lastTriggeredAt": null,
    "nextTriggerAt": null,
    "createdBy": {
      "id": "usr_123456",
      "name": "山田 太郎"
    },
    "createdAt": "2025-01-19T10:00:00Z",
    "updatedAt": "2025-01-19T15:00:00Z"
  }
}
```

---

## 付録

### A. データモデル定義

#### User（ユーザー）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | ユーザーID |
| email | string | メールアドレス |
| name | string | 氏名 |
| role | string | 役割（admin, manager, member, partner） |
| department | string | 部署 |
| partnerId | string | パートナーID（パートナーユーザーの場合） |
| permissions | array | 権限リスト |
| createdAt | string | 作成日時 |
| updatedAt | string | 更新日時 |

#### Project（案件）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | 案件ID |
| name | string | 案件名 |
| description | string | 説明 |
| status | string | ステータス（draft, active, completed, archived） |
| priority | string | 優先度（low, medium, high） |
| startDate | string | 開始日 |
| endDate | string | 終了日 |
| budget | integer | 予算 |
| actualCost | integer | 実績費用 |
| partnerId | string | パートナーID |
| managerId | string | マネージャーID |
| progress | integer | 進捗率（0-100） |
| tags | array | タグ |
| createdAt | string | 作成日時 |
| updatedAt | string | 更新日時 |

#### Task（タスク）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | タスクID |
| projectId | string | 案件ID |
| title | string | タスク名 |
| description | string | 説明 |
| status | string | ステータス（pending, in_progress, review, completed） |
| priority | string | 優先度（low, medium, high） |
| dueDate | string | 期限日 |
| estimatedHours | integer | 見積工数 |
| actualHours | integer | 実績工数 |
| assigneeId | string | 担当者ID |
| tags | array | タグ |
| isOverdue | boolean | 期限超過フラグ |
| completedAt | string | 完了日時 |
| createdAt | string | 作成日時 |
| updatedAt | string | 更新日時 |

#### Partner（パートナー）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | パートナーID |
| name | string | 会社名 |
| industry | string | 業種 |
| status | string | ステータス（pending, active, inactive） |
| description | string | 説明 |
| address | object | 住所 |
| contactPerson | string | 担当者名 |
| email | string | メールアドレス |
| phone | string | 電話番号 |
| website | string | WebサイトURL |
| rating | number | 評価（1.0-5.0） |
| skills | array | スキル |
| certifications | array | 資格 |
| contractInfo | object | 契約情報 |
| notes | string | 備考 |
| createdAt | string | 作成日時 |
| updatedAt | string | 更新日時 |

#### Reminder（リマインド）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | リマインドID |
| type | string | タイプ（task, project, custom） |
| title | string | タイトル |
| description | string | 説明 |
| isActive | boolean | 有効フラグ |
| triggerCondition | object | トリガー条件 |
| notificationChannels | array | 通知チャネル |
| targetUsers | array | 通知対象 |
| relatedProjectId | string | 関連案件ID |
| relatedTaskId | string | 関連タスクID |
| schedule | object | スケジュール |
| lastTriggeredAt | string | 最終実行日時 |
| nextTriggerAt | string | 次回実行日時 |
| createdById | string | 作成者ID |
| createdAt | string | 作成日時 |
| updatedAt | string | 更新日時 |

### B. ステータス遷移

#### Project ステータス遷移

```
draft → active → completed → archived
         ↓
       archived
```

#### Task ステータス遷移

```
pending → in_progress → review → completed
    ↓          ↓          ↓
    └──────────┴──────────┘ (どのステータスからでもpendingに戻せる)
```

### C. 権限マトリックス

| 操作 | admin | manager | member | partner |
|------|-------|---------|--------|---------|
| 案件作成 | O | O | X | X |
| 案件更新 | O | O | X | X |
| 案件削除 | O | O | X | X |
| 案件閲覧 | O | O | O | O (自社関連のみ) |
| タスク作成 | O | O | O | X |
| タスク更新 | O | O | O (自分のみ) | O (自分のみ) |
| タスク削除 | O | O | X | X |
| パートナー登録 | O | O | X | X |
| パートナー更新 | O | O | X | X |
| リマインド設定 | O | O | O | X |

---

*ドキュメント最終更新日: 2025-01-19*
