import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodeKey, ErrorCodes, ErrorCodeValue } from './error-codes';

/**
 * エラーレスポンスの詳細情報
 */
export interface ErrorDetails {
  [key: string]: unknown;
}

/**
 * カスタム例外のレスポンス構造
 */
export interface CustomExceptionResponse {
  code: string;
  message: string;
  userMessage: string;
  details?: ErrorDetails;
}

/**
 * ベース例外クラス
 *
 * すべてのカスタム例外の基底クラス。
 * エラーコード、ユーザー向けメッセージ、開発者向けメッセージを統一的に管理。
 */
export abstract class BaseException extends HttpException {
  public readonly errorCode: string;
  public readonly userMessage: string;
  public readonly details?: ErrorDetails;

  constructor(
    errorCodeKey: ErrorCodeKey,
    options?: {
      /** 開発者向けの詳細メッセージ（デフォルトはエラーコード定義のメッセージ） */
      message?: string;
      /** ユーザー向けメッセージ（デフォルトはエラーコード定義のメッセージ） */
      userMessage?: string;
      /** エラーの詳細情報 */
      details?: ErrorDetails;
      /** HTTPステータスコードのオーバーライド */
      httpStatus?: HttpStatus;
    },
  ) {
    const errorDef: ErrorCodeValue = ErrorCodes[errorCodeKey];
    const httpStatus = options?.httpStatus ?? errorDef.httpStatus;
    const message = options?.message ?? errorDef.message;
    const userMessage = options?.userMessage ?? errorDef.message;

    const response: CustomExceptionResponse = {
      code: errorDef.code,
      message,
      userMessage,
      details: options?.details,
    };

    super(response, httpStatus);

    this.errorCode = errorDef.code;
    this.userMessage = userMessage;
    this.details = options?.details;
  }

  /**
   * エラーレスポンス用のオブジェクトを取得
   */
  getErrorResponse(): CustomExceptionResponse {
    return this.getResponse() as CustomExceptionResponse;
  }
}
