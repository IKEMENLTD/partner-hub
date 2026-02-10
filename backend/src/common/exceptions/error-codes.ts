/**
 * エラーコード体系
 *
 * フォーマット: {DOMAIN}_{NUMBER}
 * - DOMAIN: 機能領域を表す接頭辞
 * - NUMBER: 3桁の連番
 *
 * ドメイン一覧:
 * - AUTH: 認証・認可関連
 * - USER: ユーザー管理関連
 * - PROJECT: プロジェクト関連
 * - TASK: タスク関連
 * - PARTNER: パートナー関連
 * - FILE: ファイル管理関連
 * - NOTIFICATION: 通知関連
 * - VALIDATION: バリデーション関連
 * - SYSTEM: システム関連
 */

export const ErrorCodes = {
  // ============================================
  // 認証・認可関連 (AUTH_001 - AUTH_099)
  // ============================================
  AUTH_001: {
    code: 'AUTH_001',
    message: '認証が必要です',
    httpStatus: 401,
  },
  AUTH_002: {
    code: 'AUTH_002',
    message: 'トークンが無効または期限切れです',
    httpStatus: 401,
  },
  AUTH_003: {
    code: 'AUTH_003',
    message: 'ログイン情報が正しくありません',
    httpStatus: 401,
  },
  AUTH_004: {
    code: 'AUTH_004',
    message: 'この操作を行う権限がありません',
    httpStatus: 403,
  },
  AUTH_005: {
    code: 'AUTH_005',
    message: 'アカウントが無効化されています',
    httpStatus: 403,
  },
  AUTH_006: {
    code: 'AUTH_006',
    message: 'リフレッシュトークンが無効です',
    httpStatus: 401,
  },
  AUTH_007: {
    code: 'AUTH_007',
    message: 'セッションが期限切れです。再度ログインしてください',
    httpStatus: 401,
  },

  // ============================================
  // ユーザー関連 (USER_001 - USER_099)
  // ============================================
  USER_001: {
    code: 'USER_001',
    message: 'ユーザーが見つかりません',
    httpStatus: 404,
  },
  USER_002: {
    code: 'USER_002',
    message: 'このメールアドレスは既に登録されています',
    httpStatus: 409,
  },
  USER_003: {
    code: 'USER_003',
    message: 'パスワードが要件を満たしていません',
    httpStatus: 400,
  },
  USER_004: {
    code: 'USER_004',
    message: 'ユーザーの更新に失敗しました',
    httpStatus: 500,
  },
  USER_005: {
    code: 'USER_005',
    message: '現在のパスワードが正しくありません',
    httpStatus: 400,
  },

  // ============================================
  // プロジェクト関連 (PROJECT_001 - PROJECT_099)
  // ============================================
  PROJECT_001: {
    code: 'PROJECT_001',
    message: 'プロジェクトが見つかりません',
    httpStatus: 404,
  },
  PROJECT_002: {
    code: 'PROJECT_002',
    message: 'プロジェクトへのアクセス権限がありません',
    httpStatus: 403,
  },
  PROJECT_003: {
    code: 'PROJECT_003',
    message: 'プロジェクトの作成に失敗しました',
    httpStatus: 500,
  },
  PROJECT_004: {
    code: 'PROJECT_004',
    message: 'プロジェクトの更新に失敗しました',
    httpStatus: 500,
  },
  PROJECT_005: {
    code: 'PROJECT_005',
    message: 'プロジェクトの削除に失敗しました',
    httpStatus: 500,
  },
  PROJECT_006: {
    code: 'PROJECT_006',
    message: 'プロジェクト名は既に使用されています',
    httpStatus: 409,
  },
  PROJECT_007: {
    code: 'PROJECT_007',
    message: 'このプロジェクトにはアクティブなタスクが存在するため、削除できません',
    httpStatus: 400,
  },
  PROJECT_008: {
    code: 'PROJECT_008',
    message: 'プロジェクトのステータス変更が無効です',
    httpStatus: 400,
  },

  // ============================================
  // タスク関連 (TASK_001 - TASK_099)
  // ============================================
  TASK_001: {
    code: 'TASK_001',
    message: 'タスクが見つかりません',
    httpStatus: 404,
  },
  TASK_002: {
    code: 'TASK_002',
    message: 'タスクへのアクセス権限がありません',
    httpStatus: 403,
  },
  TASK_003: {
    code: 'TASK_003',
    message: 'タスクの作成に失敗しました',
    httpStatus: 500,
  },
  TASK_004: {
    code: 'TASK_004',
    message: 'タスクの更新に失敗しました',
    httpStatus: 500,
  },
  TASK_005: {
    code: 'TASK_005',
    message: 'タスクの削除に失敗しました',
    httpStatus: 500,
  },
  TASK_006: {
    code: 'TASK_006',
    message: 'タスクのステータス変更が無効です',
    httpStatus: 400,
  },
  TASK_007: {
    code: 'TASK_007',
    message: '期限日は現在日時より後である必要があります',
    httpStatus: 400,
  },
  TASK_008: {
    code: 'TASK_008',
    message: '担当者の割り当てに失敗しました',
    httpStatus: 500,
  },
  TASK_009: {
    code: 'TASK_009',
    message: '親タスクが見つかりません',
    httpStatus: 404,
  },
  TASK_010: {
    code: 'TASK_010',
    message: 'タスクに循環参照が検出されました',
    httpStatus: 400,
  },
  TASK_011: {
    code: 'TASK_011',
    message: 'サブタスクが見つかりません',
    httpStatus: 404,
  },

  // ============================================
  // パートナー関連 (PARTNER_001 - PARTNER_099)
  // ============================================
  PARTNER_001: {
    code: 'PARTNER_001',
    message: 'パートナーが見つかりません',
    httpStatus: 404,
  },
  PARTNER_002: {
    code: 'PARTNER_002',
    message: 'パートナーへのアクセス権限がありません',
    httpStatus: 403,
  },
  PARTNER_003: {
    code: 'PARTNER_003',
    message: 'パートナーの作成に失敗しました',
    httpStatus: 500,
  },
  PARTNER_004: {
    code: 'PARTNER_004',
    message: 'パートナーの更新に失敗しました',
    httpStatus: 500,
  },
  PARTNER_005: {
    code: 'PARTNER_005',
    message: 'パートナーの削除に失敗しました',
    httpStatus: 500,
  },
  PARTNER_006: {
    code: 'PARTNER_006',
    message: 'この企業は既にパートナーとして登録されています',
    httpStatus: 409,
  },
  PARTNER_007: {
    code: 'PARTNER_007',
    message: 'パートナー契約が有効期限切れです',
    httpStatus: 400,
  },

  // ============================================
  // ファイル関連 (FILE_001 - FILE_099)
  // ============================================
  FILE_001: {
    code: 'FILE_001',
    message: 'ファイルが見つかりません',
    httpStatus: 404,
  },
  FILE_002: {
    code: 'FILE_002',
    message: 'ファイルのアップロードに失敗しました',
    httpStatus: 500,
  },
  FILE_003: {
    code: 'FILE_003',
    message: 'ファイルサイズが上限を超えています',
    httpStatus: 400,
  },
  FILE_004: {
    code: 'FILE_004',
    message: '許可されていないファイル形式です',
    httpStatus: 400,
  },
  FILE_005: {
    code: 'FILE_005',
    message: 'ファイルの削除に失敗しました',
    httpStatus: 500,
  },
  FILE_006: {
    code: 'FILE_006',
    message: 'ファイルへのアクセス権限がありません',
    httpStatus: 403,
  },

  // ============================================
  // 通知関連 (NOTIFICATION_001 - NOTIFICATION_099)
  // ============================================
  NOTIFICATION_001: {
    code: 'NOTIFICATION_001',
    message: '通知が見つかりません',
    httpStatus: 404,
  },
  NOTIFICATION_002: {
    code: 'NOTIFICATION_002',
    message: '通知の送信に失敗しました',
    httpStatus: 500,
  },
  NOTIFICATION_003: {
    code: 'NOTIFICATION_003',
    message: '通知設定の更新に失敗しました',
    httpStatus: 500,
  },

  // ============================================
  // バリデーション関連 (VALIDATION_001 - VALIDATION_099)
  // ============================================
  VALIDATION_001: {
    code: 'VALIDATION_001',
    message: '入力データが不正です',
    httpStatus: 400,
  },
  VALIDATION_002: {
    code: 'VALIDATION_002',
    message: '必須項目が入力されていません',
    httpStatus: 400,
  },
  VALIDATION_003: {
    code: 'VALIDATION_003',
    message: '入力形式が正しくありません',
    httpStatus: 400,
  },
  VALIDATION_004: {
    code: 'VALIDATION_004',
    message: '値が許容範囲外です',
    httpStatus: 400,
  },
  VALIDATION_005: {
    code: 'VALIDATION_005',
    message: '文字数が上限を超えています',
    httpStatus: 400,
  },

  // ============================================
  // レポート関連 (REPORT_001 - REPORT_099)
  // ============================================
  REPORT_001: {
    code: 'REPORT_001',
    message: 'レポートが見つかりません',
    httpStatus: 404,
  },
  REPORT_002: {
    code: 'REPORT_002',
    message: 'レポートの生成に失敗しました',
    httpStatus: 500,
  },
  REPORT_003: {
    code: 'REPORT_003',
    message: 'レポートへのアクセス権限がありません',
    httpStatus: 403,
  },

  // ============================================
  // ダッシュボード関連 (DASHBOARD_001 - DASHBOARD_099)
  // ============================================
  DASHBOARD_001: {
    code: 'DASHBOARD_001',
    message: 'ダッシュボードデータの取得に失敗しました',
    httpStatus: 500,
  },
  DASHBOARD_002: {
    code: 'DASHBOARD_002',
    message: '指定された期間が不正です',
    httpStatus: 400,
  },

  // ============================================
  // システム関連 (SYSTEM_001 - SYSTEM_099)
  // ============================================
  SYSTEM_001: {
    code: 'SYSTEM_001',
    message: 'システムエラーが発生しました',
    httpStatus: 500,
  },
  SYSTEM_002: {
    code: 'SYSTEM_002',
    message: 'データベース接続エラーが発生しました',
    httpStatus: 500,
  },
  SYSTEM_003: {
    code: 'SYSTEM_003',
    message: '外部サービスとの通信に失敗しました',
    httpStatus: 502,
  },
  SYSTEM_004: {
    code: 'SYSTEM_004',
    message: 'サービスが一時的に利用できません',
    httpStatus: 503,
  },
  SYSTEM_005: {
    code: 'SYSTEM_005',
    message: 'リクエストがタイムアウトしました',
    httpStatus: 504,
  },
  SYSTEM_006: {
    code: 'SYSTEM_006',
    message: 'レート制限に達しました。しばらく待ってから再試行してください',
    httpStatus: 429,
  },
} as const;

export type ErrorCodeKey = keyof typeof ErrorCodes;
export type ErrorCodeValue = (typeof ErrorCodes)[ErrorCodeKey];
