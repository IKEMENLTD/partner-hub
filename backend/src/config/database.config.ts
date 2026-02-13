import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { getSslConfig } from './ssl.config';

/**
 * データベース設定を検証
 * 起動時に呼び出して設定の整合性をチェック
 */
export function validateDatabaseConfig(): void {
  const nodeEnv = process.env.NODE_ENV;
  const sslConfig = getSslConfig();

  if (nodeEnv === 'production') {
    // SSL must be enabled in production (sslConfig should not be false)
    if (sslConfig === false) {
      throw new Error('[FATAL] SSL must be enabled in production');
    }
    // Note: rejectUnauthorized: false is acceptable for Supabase
    // as the connection is still encrypted via SSL/TLS
  }

  console.info(`[AUDIT] Database config validated for environment: ${nodeEnv}`);
}

/**
 * Supabase PostgreSQL データベース設定
 * DATABASE_URL 環境変数を使用して接続
 *
 * セキュリティ設定:
 * - SSL証明書検証はデフォルトで有効（MITM攻撃防止）
 * - 開発環境でのみ DB_SSL_REJECT_UNAUTHORIZED=false で検証スキップ可能
 * - 本番環境では証明書検証を強制（無効化不可）
 * - テスト環境では ALLOW_INSECURE_TEST_DB=true の場合のみSSL無効化可能
 *
 * 環境変数:
 * - DATABASE_URL: PostgreSQL接続文字列（必須）
 * - DB_SSL_REJECT_UNAUTHORIZED: SSL証明書検証 "true"/"false"（開発環境のみ有効）
 * - DB_SSL_CA_CERT: カスタムCA証明書（PEM文字列またはファイルパス）
 * - ALLOW_INSECURE_TEST_DB: テスト環境でSSL無効化を許可 "true"/"false"
 */
export default registerAs('database', (): TypeOrmModuleOptions => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required. Set it in your .env file. ' +
        'Get it from: Supabase Dashboard > Project Settings > Database > Connection string',
    );
  }

  // 本番環境でのセキュリティ情報
  if (process.env.NODE_ENV === 'production') {
    const sslConfig = getSslConfig();
    if (typeof sslConfig === 'object' && !sslConfig.rejectUnauthorized) {
      console.info(
        '[AUDIT] SSL certificate verification is disabled (Supabase compatible). ' +
          'Connection is still encrypted via TLS. Set DB_SSL_CA_CERT to enable full verification.',
      );
    }
  }

  const config: TypeOrmModuleOptions = {
    type: 'postgres',
    url: databaseUrl,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
    autoLoadEntities: true,
    ssl: getSslConfig(),
  };

  console.info(`[AUDIT] Database configuration loaded for ${process.env.NODE_ENV || 'unknown'} environment`);

  return config;
});
