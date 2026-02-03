import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  BaseException,
  CustomExceptionResponse,
} from '../exceptions/base.exception';
import { ValidationException } from '../exceptions/validation.exception';

/**
 * 統一エラーレスポンス形式
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
}

/**
 * HTTP例外フィルター
 *
 * すべての例外をキャッチし、統一されたエラーレスポンス形式に変換。
 * カスタム例外（BaseException継承）の場合は、エラーコードと詳細情報を含める。
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, errorResponse } = this.buildErrorResponse(
      exception,
      request,
    );

    // ログ出力
    this.logException(exception, request, status);

    response.status(status).json(errorResponse);
  }

  /**
   * 例外からエラーレスポンスを構築
   */
  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): { status: number; errorResponse: ErrorResponse } {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'SYSTEM_001';
    let message = 'システムエラーが発生しました';
    let details: Record<string, unknown> | undefined = undefined;

    // カスタム例外（BaseException継承）の処理
    if (exception instanceof BaseException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getErrorResponse();
      code = exceptionResponse.code;
      message = exceptionResponse.userMessage;
      details = exceptionResponse.details;

      // ValidationExceptionの特別処理
      if (exception instanceof ValidationException && exception.fieldErrors) {
        details = {
          ...details,
          fieldErrors: exception.fieldErrors,
        };
      }
    }
    // 標準HttpExceptionの処理
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = this.getCodeFromStatus(status);
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as {
          message?: string | string[];
          error?: string;
          statusCode?: number;
        };

        message = Array.isArray(responseObj.message)
          ? responseObj.message.join(', ')
          : responseObj.message || this.getMessageFromStatus(status);

        code = this.getCodeFromStatus(status);

        // class-validatorのバリデーションエラーの場合
        if (
          status === HttpStatus.BAD_REQUEST &&
          Array.isArray(responseObj.message)
        ) {
          code = 'VALIDATION_001';
          details = { validationErrors: responseObj.message };
        }
      }
    }
    // 予期しないエラーの処理
    else if (exception instanceof Error) {
      message = 'システムエラーが発生しました';
      // 本番環境では詳細なエラーメッセージを隠す
      if (process.env.NODE_ENV === 'development') {
        details = { originalMessage: exception.message };
      }
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // リクエストIDがあれば含める
    const requestId = request.headers['x-request-id'] as string | undefined;
    if (requestId) {
      errorResponse.requestId = requestId;
    }

    return { status, errorResponse };
  }

  /**
   * HTTPステータスコードからエラーコードを取得
   */
  private getCodeFromStatus(status: number): string {
    const statusCodeMap: Record<number, string> = {
      400: 'VALIDATION_001',
      401: 'AUTH_001',
      403: 'AUTH_004',
      404: 'SYSTEM_001',
      409: 'SYSTEM_001',
      429: 'SYSTEM_006',
      500: 'SYSTEM_001',
      502: 'SYSTEM_003',
      503: 'SYSTEM_004',
      504: 'SYSTEM_005',
    };
    return statusCodeMap[status] || 'SYSTEM_001';
  }

  /**
   * HTTPステータスコードからデフォルトメッセージを取得
   */
  private getMessageFromStatus(status: number): string {
    const statusMessageMap: Record<number, string> = {
      400: '入力データが不正です',
      401: '認証が必要です',
      403: 'この操作を行う権限がありません',
      404: 'リソースが見つかりません',
      409: 'リソースが競合しています',
      429: 'リクエストが多すぎます。しばらく待ってから再試行してください',
      500: 'システムエラーが発生しました',
      502: '外部サービスとの通信に失敗しました',
      503: 'サービスが一時的に利用できません',
      504: 'リクエストがタイムアウトしました',
    };
    return statusMessageMap[status] || 'エラーが発生しました';
  }

  /**
   * 例外をログ出力
   */
  private logException(
    exception: unknown,
    request: Request,
    status: number,
  ): void {
    const logContext = {
      method: request.method,
      url: request.url,
      status,
      userId: (request as Request & { user?: { id?: string } }).user?.id,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    };

    if (status >= 500) {
      // サーバーエラーはエラーレベルでログ出力
      if (exception instanceof Error) {
        this.logger.error(
          `${request.method} ${request.url} ${status} - ${exception.message}`,
          exception.stack,
          logContext,
        );
      } else {
        this.logger.error(
          `${request.method} ${request.url} ${status}`,
          undefined,
          logContext,
        );
      }
    } else if (status >= 400) {
      // クライアントエラーは警告レベルでログ出力
      const message =
        exception instanceof Error ? exception.message : 'Client error';
      this.logger.warn(
        `${request.method} ${request.url} ${status} - ${message}`,
        logContext,
      );
    }
  }
}
