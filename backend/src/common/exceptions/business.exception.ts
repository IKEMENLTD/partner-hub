import { HttpStatus } from '@nestjs/common';
import { BaseException, ErrorDetails } from './base.exception';
import { ErrorCodeKey } from './error-codes';

/**
 * ビジネスロジック例外
 *
 * ビジネスルール違反や業務ロジックエラーを表す例外。
 * 例: 重複登録、状態遷移エラー、業務制約違反など
 *
 * @example
 * // 基本的な使用方法
 * throw new BusinessException('PROJECT_006');
 *
 * @example
 * // カスタムメッセージと詳細情報付き
 * throw new BusinessException('PROJECT_006', {
 *   message: 'プロジェクト名が重複しています',
 *   userMessage: '同じ名前のプロジェクトが既に存在します',
 *   details: { projectName: 'テストプロジェクト' }
 * });
 */
export class BusinessException extends BaseException {
  constructor(
    errorCodeKey: ErrorCodeKey,
    options?: {
      /** 開発者向けの詳細メッセージ */
      message?: string;
      /** ユーザー向けメッセージ */
      userMessage?: string;
      /** エラーの詳細情報 */
      details?: ErrorDetails;
      /** HTTPステータスコードのオーバーライド */
      httpStatus?: HttpStatus;
    },
  ) {
    super(errorCodeKey, options);
  }
}

/**
 * 認証例外
 *
 * 認証関連のエラーを表す例外。
 * 例: 未認証、トークン期限切れ、無効な認証情報など
 *
 * @example
 * throw new AuthenticationException('AUTH_002', {
 *   details: { reason: 'トークンの有効期限が切れています' }
 * });
 */
export class AuthenticationException extends BaseException {
  constructor(
    errorCodeKey: ErrorCodeKey,
    options?: {
      message?: string;
      userMessage?: string;
      details?: ErrorDetails;
    },
  ) {
    super(errorCodeKey, {
      ...options,
      httpStatus: HttpStatus.UNAUTHORIZED,
    });
  }
}

/**
 * 認可例外
 *
 * 権限不足によるエラーを表す例外。
 * 例: アクセス権限なし、操作権限なしなど
 *
 * @example
 * throw new AuthorizationException('AUTH_004', {
 *   details: { requiredRole: 'admin', currentRole: 'user' }
 * });
 */
export class AuthorizationException extends BaseException {
  constructor(
    errorCodeKey: ErrorCodeKey,
    options?: {
      message?: string;
      userMessage?: string;
      details?: ErrorDetails;
    },
  ) {
    super(errorCodeKey, {
      ...options,
      httpStatus: HttpStatus.FORBIDDEN,
    });
  }
}

/**
 * 競合例外
 *
 * リソースの競合状態を表す例外。
 * 例: 重複登録、同時更新の競合など
 *
 * @example
 * throw new ConflictException('USER_002', {
 *   details: { email: 'test@example.com' }
 * });
 */
export class ConflictException extends BaseException {
  constructor(
    errorCodeKey: ErrorCodeKey,
    options?: {
      message?: string;
      userMessage?: string;
      details?: ErrorDetails;
    },
  ) {
    super(errorCodeKey, {
      ...options,
      httpStatus: HttpStatus.CONFLICT,
    });
  }
}
