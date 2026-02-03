import { HttpStatus } from '@nestjs/common';
import { BaseException, ErrorDetails } from './base.exception';
import { ErrorCodeKey } from './error-codes';

/**
 * システム例外
 *
 * システム内部のエラーを表す例外。
 * データベースエラー、外部サービスエラーなど、技術的な問題を表現。
 *
 * @example
 * // 基本的な使用方法
 * throw new SystemException('SYSTEM_001');
 *
 * @example
 * // 詳細情報付き
 * throw new SystemException('SYSTEM_002', {
 *   message: 'Database connection failed',
 *   cause: originalError
 * });
 */
export class SystemException extends BaseException {
  public readonly originalError?: Error;

  constructor(
    errorCodeKey: ErrorCodeKey = 'SYSTEM_001',
    options?: {
      /** 開発者向けの詳細メッセージ */
      message?: string;
      /** ユーザー向けメッセージ */
      userMessage?: string;
      /** エラーの詳細情報 */
      details?: ErrorDetails;
      /** HTTPステータスコードのオーバーライド */
      httpStatus?: HttpStatus;
      /** 元となったエラー */
      originalError?: Error;
    },
  ) {
    super(errorCodeKey, {
      message: options?.message,
      userMessage:
        options?.userMessage ?? 'システムエラーが発生しました。しばらく待ってから再試行してください。',
      details: options?.details,
      httpStatus: options?.httpStatus ?? HttpStatus.INTERNAL_SERVER_ERROR,
    });

    this.originalError = options?.originalError;
  }

  /**
   * データベースエラー例外を生成
   */
  static database(
    options?: { message?: string; originalError?: Error },
  ): SystemException {
    return new SystemException('SYSTEM_002', {
      message: options?.message ?? 'Database operation failed',
      originalError: options?.originalError,
    });
  }

  /**
   * 外部サービスエラー例外を生成
   */
  static externalService(
    serviceName: string,
    options?: { message?: string; originalError?: Error },
  ): SystemException {
    return new SystemException('SYSTEM_003', {
      message: options?.message ?? `External service '${serviceName}' failed`,
      details: { serviceName },
      originalError: options?.originalError,
      httpStatus: HttpStatus.BAD_GATEWAY,
    });
  }

  /**
   * サービス利用不可例外を生成
   */
  static serviceUnavailable(
    options?: { message?: string; retryAfter?: number },
  ): SystemException {
    return new SystemException('SYSTEM_004', {
      message: options?.message ?? 'Service temporarily unavailable',
      details: options?.retryAfter ? { retryAfter: options.retryAfter } : undefined,
      httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    });
  }

  /**
   * タイムアウト例外を生成
   */
  static timeout(
    operation?: string,
    options?: { timeoutMs?: number },
  ): SystemException {
    return new SystemException('SYSTEM_005', {
      message: operation
        ? `Operation '${operation}' timed out`
        : 'Request timed out',
      details: {
        ...(operation && { operation }),
        ...(options?.timeoutMs && { timeoutMs: options.timeoutMs }),
      },
      httpStatus: HttpStatus.GATEWAY_TIMEOUT,
    });
  }

  /**
   * レート制限例外を生成
   */
  static rateLimited(
    options?: { retryAfter?: number; limit?: number },
  ): SystemException {
    return new SystemException('SYSTEM_006', {
      message: 'Rate limit exceeded',
      details: {
        ...(options?.retryAfter && { retryAfter: options.retryAfter }),
        ...(options?.limit && { limit: options.limit }),
      },
      httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    });
  }
}
