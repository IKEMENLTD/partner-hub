import { Injectable, Logger } from '@nestjs/common';
import { AuthorizationException } from '../exceptions/business.exception';
import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { UserRole } from '../../modules/auth/enums/user-role.enum';

export interface TenantContext {
  userId: string;
  organizationId?: string;
  role: UserRole;
}

/**
 * マルチテナントデータ分離ユーティリティサービス
 *
 * セキュリティ: テナント固有データを扱うすべてのサービスは、
 * このクラスを継承するか、ユーティリティメソッドを使用して
 * 適切なデータ分離を確保する必要があります。
 */
@Injectable()
export class MultiTenantService {
  protected readonly logger = new Logger(this.constructor.name);

  /**
   * クエリビルダーに組織フィルターを適用
   *
   * @param queryBuilder - TypeORM QueryBuilder
   * @param alias - クエリ内のエンティティエイリアス
   * @param organizationId - フィルターする組織ID
   * @param fieldName - 組織フィールド名（デフォルト: 'organizationId'）
   */
  protected applyOrganizationFilter<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    alias: string,
    organizationId: string | undefined,
    fieldName: string = 'organizationId',
  ): SelectQueryBuilder<T> {
    if (organizationId) {
      queryBuilder.andWhere(`${alias}.${fieldName} = :organizationId`, { organizationId });
    }
    return queryBuilder;
  }

  /**
   * エンティティがユーザーの組織に属しているか検証
   *
   * セキュリティ: 機密データに対する読み取り/更新/削除操作の前に呼び出すこと
   *
   * @param entity - 検証するエンティティ
   * @param userOrganizationId - ユーザーの組織ID
   * @param entityName - エラーメッセージ用のエンティティ名
   * @throws ForbiddenException 組織が一致しない場合
   */
  protected validateOrganizationAccess<T extends { organizationId?: string }>(
    entity: T,
    userOrganizationId: string | undefined,
    entityName: string = 'resource',
  ): void {
    // ユーザーに組織がない場合、組織のないリソースのみアクセス可能
    if (!userOrganizationId) {
      if (entity.organizationId) {
        this.logger.warn(`Unauthorized cross-tenant access attempt to ${entityName}`);
        throw new AuthorizationException('AUTH_002', {
        message: `You do not have permission to access this ${entityName}`,
        userMessage: `この${entityName}へのアクセス権限がありません`,
      });
      }
      return;
    }

    // エンティティに組織がある場合、ユーザーの組織と一致する必要がある
    if (entity.organizationId && entity.organizationId !== userOrganizationId) {
      this.logger.warn(
        `Cross-tenant access attempt: user org ${userOrganizationId} tried to access ${entityName} in org ${entity.organizationId}`,
      );
      throw new AuthorizationException('AUTH_002', {
        message: `You do not have permission to access this ${entityName}`,
        userMessage: `この${entityName}へのアクセス権限がありません`,
      });
    }
  }

  /**
   * ユーザーがスーパー管理者かどうかをチェック（全組織アクセス可能）
   */
  protected isSuperAdmin(context: TenantContext): boolean {
    return context.role === UserRole.ADMIN && !context.organizationId;
  }

  /**
   * TypeORM find操作用の組織フィルターオブジェクトを構築
   */
  protected buildOrganizationWhere(organizationId: string | undefined): Record<string, string> | Record<string, never> {
    return organizationId ? { organizationId } : {};
  }
}
