import { SetMetadata } from '@nestjs/common';
import { SKIP_ORGANIZATION_CHECK } from '../guards/organization.guard';

/**
 * 組織チェックをスキップするデコレーター
 *
 * 公開APIや管理者専用APIなど、組織チェックが不要なエンドポイントに使用します。
 */
export const SkipOrganizationCheck = () => SetMetadata(SKIP_ORGANIZATION_CHECK, true);
