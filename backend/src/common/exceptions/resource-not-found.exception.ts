import { HttpStatus } from '@nestjs/common';
import { BaseException, ErrorDetails } from './base.exception';
import { ErrorCodeKey } from './error-codes';

/**
 * リソース未発見例外
 *
 * 指定されたリソースが見つからない場合の例外。
 * リソース種別とIDを含めることで、どのリソースが見つからなかったかを明確化。
 *
 * @example
 * // 基本的な使用方法
 * throw new ResourceNotFoundException('PROJECT_001');
 *
 * @example
 * // リソース情報付き
 * throw new ResourceNotFoundException('PROJECT_001', {
 *   resourceType: 'Project',
 *   resourceId: 'abc-123'
 * });
 *
 * @example
 * // ファクトリメソッドを使用
 * throw ResourceNotFoundException.forProject('abc-123');
 * throw ResourceNotFoundException.forTask('task-456');
 */
export class ResourceNotFoundException extends BaseException {
  public readonly resourceType?: string;
  public readonly resourceId?: string | number;

  constructor(
    errorCodeKey: ErrorCodeKey,
    options?: {
      /** 開発者向けの詳細メッセージ */
      message?: string;
      /** ユーザー向けメッセージ */
      userMessage?: string;
      /** リソースの種類（例: 'Project', 'Task'） */
      resourceType?: string;
      /** リソースのID */
      resourceId?: string | number;
      /** その他の詳細情報 */
      details?: ErrorDetails;
    },
  ) {
    const details: ErrorDetails = {
      ...options?.details,
    };

    if (options?.resourceType) {
      details.resourceType = options.resourceType;
    }
    if (options?.resourceId !== undefined) {
      details.resourceId = options.resourceId;
    }

    const message =
      options?.message ??
      (options?.resourceType && options?.resourceId
        ? `${options.resourceType} with id '${options.resourceId}' not found`
        : undefined);

    super(errorCodeKey, {
      message,
      userMessage: options?.userMessage,
      details: Object.keys(details).length > 0 ? details : undefined,
      httpStatus: HttpStatus.NOT_FOUND,
    });

    this.resourceType = options?.resourceType;
    this.resourceId = options?.resourceId;
  }

  // ====================================
  // ファクトリメソッド
  // ====================================

  /**
   * プロジェクト未発見例外を生成
   */
  static forProject(
    projectId: string | number,
    options?: { message?: string; userMessage?: string },
  ): ResourceNotFoundException {
    return new ResourceNotFoundException('PROJECT_001', {
      resourceType: 'Project',
      resourceId: projectId,
      ...options,
    });
  }

  /**
   * タスク未発見例外を生成
   */
  static forTask(
    taskId: string | number,
    options?: { message?: string; userMessage?: string },
  ): ResourceNotFoundException {
    return new ResourceNotFoundException('TASK_001', {
      resourceType: 'Task',
      resourceId: taskId,
      ...options,
    });
  }

  /**
   * ユーザー未発見例外を生成
   */
  static forUser(
    userId: string | number,
    options?: { message?: string; userMessage?: string },
  ): ResourceNotFoundException {
    return new ResourceNotFoundException('USER_001', {
      resourceType: 'User',
      resourceId: userId,
      ...options,
    });
  }

  /**
   * パートナー未発見例外を生成
   */
  static forPartner(
    partnerId: string | number,
    options?: { message?: string; userMessage?: string },
  ): ResourceNotFoundException {
    return new ResourceNotFoundException('PARTNER_001', {
      resourceType: 'Partner',
      resourceId: partnerId,
      ...options,
    });
  }

  /**
   * ファイル未発見例外を生成
   */
  static forFile(
    fileId: string | number,
    options?: { message?: string; userMessage?: string },
  ): ResourceNotFoundException {
    return new ResourceNotFoundException('FILE_001', {
      resourceType: 'File',
      resourceId: fileId,
      ...options,
    });
  }

  /**
   * 通知未発見例外を生成
   */
  static forNotification(
    notificationId: string | number,
    options?: { message?: string; userMessage?: string },
  ): ResourceNotFoundException {
    return new ResourceNotFoundException('NOTIFICATION_001', {
      resourceType: 'Notification',
      resourceId: notificationId,
      ...options,
    });
  }

  /**
   * レポート未発見例外を生成
   */
  static forReport(
    reportId: string | number,
    options?: { message?: string; userMessage?: string },
  ): ResourceNotFoundException {
    return new ResourceNotFoundException('REPORT_001', {
      resourceType: 'Report',
      resourceId: reportId,
      ...options,
    });
  }
}
