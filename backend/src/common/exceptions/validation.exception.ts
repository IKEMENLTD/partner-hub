import { HttpStatus } from '@nestjs/common';
import { BaseException, ErrorDetails } from './base.exception';
import { ErrorCodeKey } from './error-codes';

/**
 * バリデーションエラーのフィールド情報
 */
export interface ValidationFieldError {
  field: string;
  value?: unknown;
  constraints: string[];
}

/**
 * バリデーション例外
 *
 * 入力値の検証エラーを表す例外。
 * フィールド単位のエラー情報を含めることが可能。
 *
 * @example
 * // 基本的な使用方法
 * throw new ValidationException('VALIDATION_001');
 *
 * @example
 * // フィールドエラー付き
 * throw new ValidationException('VALIDATION_001', {
 *   fieldErrors: [
 *     { field: 'email', constraints: ['有効なメールアドレスを入力してください'] },
 *     { field: 'password', constraints: ['8文字以上で入力してください'] }
 *   ]
 * });
 *
 * @example
 * // class-validatorのエラーから生成
 * const exception = ValidationException.fromClassValidator(validationErrors);
 */
export class ValidationException extends BaseException {
  public readonly fieldErrors?: ValidationFieldError[];

  constructor(
    errorCodeKey: ErrorCodeKey = 'VALIDATION_001',
    options?: {
      /** 開発者向けの詳細メッセージ */
      message?: string;
      /** ユーザー向けメッセージ */
      userMessage?: string;
      /** エラーの詳細情報 */
      details?: ErrorDetails;
      /** フィールド単位のエラー情報 */
      fieldErrors?: ValidationFieldError[];
    },
  ) {
    const details: ErrorDetails = {
      ...options?.details,
    };

    if (options?.fieldErrors && options.fieldErrors.length > 0) {
      details.fieldErrors = options.fieldErrors;
    }

    super(errorCodeKey, {
      message: options?.message,
      userMessage: options?.userMessage,
      details: Object.keys(details).length > 0 ? details : undefined,
      httpStatus: HttpStatus.BAD_REQUEST,
    });

    this.fieldErrors = options?.fieldErrors;
  }

  /**
   * class-validatorのValidationErrorからValidationExceptionを生成
   *
   * @param errors class-validatorのValidationError配列
   * @returns ValidationException
   */
  static fromClassValidator(
    errors: Array<{
      property: string;
      value?: unknown;
      constraints?: Record<string, string>;
      children?: unknown[];
    }>,
  ): ValidationException {
    const fieldErrors: ValidationFieldError[] = [];

    const extractErrors = (
      err: {
        property: string;
        value?: unknown;
        constraints?: Record<string, string>;
        children?: unknown[];
      },
      prefix = '',
    ): void => {
      const fieldName = prefix ? `${prefix}.${err.property}` : err.property;

      if (err.constraints) {
        fieldErrors.push({
          field: fieldName,
          value: err.value,
          constraints: Object.values(err.constraints),
        });
      }

      // ネストされたバリデーションエラーを処理
      if (err.children && Array.isArray(err.children)) {
        err.children.forEach((child) => {
          if (typeof child === 'object' && child !== null) {
            extractErrors(
              child as {
                property: string;
                value?: unknown;
                constraints?: Record<string, string>;
                children?: unknown[];
              },
              fieldName,
            );
          }
        });
      }
    };

    errors.forEach((err) => extractErrors(err));

    const constraintMessages = fieldErrors
      .flatMap((fe) => fe.constraints)
      .slice(0, 3);
    const userMessage =
      constraintMessages.length > 0
        ? constraintMessages.join('、')
        : '入力データが不正です';

    return new ValidationException('VALIDATION_001', {
      message: `Validation failed for ${fieldErrors.length} field(s)`,
      userMessage,
      fieldErrors,
    });
  }
}
