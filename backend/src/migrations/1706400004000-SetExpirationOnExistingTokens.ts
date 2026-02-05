import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 既存のパートナーレポートトークンにデフォルト有効期限を設定
 *
 * expiresAt が NULL のトークンは永続的に有効となるセキュリティリスクがあるため、
 * 既存トークンに90日の有効期限を設定する。
 */
export class SetExpirationOnExistingTokens1706400004000
  implements MigrationInterface
{
  name = 'SetExpirationOnExistingTokens1706400004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // expiresAt が NULL かつアクティブなトークンに、今日から90日後の有効期限を設定
    await queryRunner.query(`
      UPDATE partner_report_tokens
      SET expires_at = NOW() + INTERVAL '90 days'
      WHERE expires_at IS NULL
        AND is_active = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ロールバック: 元の NULL 状態には戻さない（セキュリティ上の理由）
    // 必要な場合は手動で対応
  }
}
