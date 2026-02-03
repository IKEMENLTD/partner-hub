import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as fs from 'fs';

/**
 * 環境変数のブール値を厳密に解析
 * @throws Error 無効な値の場合
 */
function parseEnvBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') return defaultValue;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error(`Invalid boolean value for SSL config: "${value}". Expected "true" or "false".`);
}

/**
 * CA証明書を検証して読み込む
 * @param certPathOrContent ファイルパスまたはPEM形式の証明書文字列
 * @throws Error 無効な証明書の場合
 */
function loadAndValidateCaCert(certPathOrContent: string): string {
  const pemRegex = /-----BEGIN CERTIFICATE-----[\s\S]*-----END CERTIFICATE-----/;

  // PEM形式の文字列として直接渡された場合
  if (pemRegex.test(certPathOrContent)) {
    console.info('[AUDIT] CA certificate loaded from environment variable (inline PEM)');
    return certPathOrContent;
  }

  // ファイルパスとして解釈
  if (fs.existsSync(certPathOrContent)) {
    const cert = fs.readFileSync(certPathOrContent, 'utf8');
    if (!pemRegex.test(cert)) {
      throw new Error(`CA certificate file is not valid PEM format: ${certPathOrContent}`);
    }
    console.info(`[AUDIT] CA certificate loaded from file: ${certPathOrContent}`);
    return cert;
  }

  throw new Error(
    `DB_SSL_CA_CERT must be either a valid PEM certificate string or a path to a certificate file. ` +
    `Received: "${certPathOrContent.substring(0, 50)}..."`
  );
}

/**
 * SSL設定を環境に応じて生成する
 *
 * セキュリティ方針:
 * - production: 必ずSSL証明書検証を有効化（MITM攻撃防止）
 * - development: SSL有効だが、DB_SSL_REJECT_UNAUTHORIZED=falseで検証スキップ可能
 * - test: ALLOW_INSECURE_TEST_DB=trueの場合のみSSL無効化可能
 */
function getSslConfig(): boolean | { rejectUnauthorized: boolean; ca?: string } {
  const nodeEnv = process.env.NODE_ENV;
  const dbSslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED;
  const caCertConfig = process.env.DB_SSL_CA_CERT;

  // 本番環境: 必ずSSL証明書検証を有効化
  if (nodeEnv === 'production') {
    const sslConfig: { rejectUnauthorized: boolean; ca?: string } = {
      rejectUnauthorized: true,
    };

    // カスタムCA証明書が設定されている場合は検証して使用
    if (caCertConfig) {
      sslConfig.ca = loadAndValidateCaCert(caCertConfig);
    }

    console.info('[AUDIT] Production SSL config: rejectUnauthorized=true');
    return sslConfig;
  }

  // テスト環境: 明示的な許可フラグが必要
  if (nodeEnv === 'test') {
    const allowInsecure = parseEnvBoolean(process.env.ALLOW_INSECURE_TEST_DB, false);
    if (allowInsecure) {
      console.warn('[AUDIT] Insecure test DB connection allowed (ALLOW_INSECURE_TEST_DB=true)');
      return false;
    }
    // テスト環境でもデフォルトはSSL有効
    return { rejectUnauthorized: true };
  }

  // 開発環境: デフォルトはSSL検証有効、必要に応じて無効化可能
  const rejectUnauthorized = parseEnvBoolean(dbSslRejectUnauthorized, true);

  if (!rejectUnauthorized) {
    console.warn(
      '[SECURITY WARNING] SSL certificate verification is disabled. ' +
        'This should only be used for local development with self-signed certificates.',
    );
  } else {
    console.info('[AUDIT] Development SSL config: rejectUnauthorized=true');
  }

  const sslConfig: { rejectUnauthorized: boolean; ca?: string } = {
    rejectUnauthorized,
  };

  // 開発環境でもカスタムCA証明書を使用可能
  if (caCertConfig) {
    sslConfig.ca = loadAndValidateCaCert(caCertConfig);
  }

  return sslConfig;
}

/**
 * データベース設定を検証
 * 起動時に呼び出して設定の整合性をチェック
 */
export function validateDatabaseConfig(): void {
  const nodeEnv = process.env.NODE_ENV;
  const sslConfig = getSslConfig();

  if (nodeEnv === 'production') {
    if (sslConfig === false || (typeof sslConfig === 'object' && !sslConfig.rejectUnauthorized)) {
      throw new Error('[FATAL] SSL certificate verification must be enabled in production');
    }
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

  // 本番環境でのセキュリティチェック
  if (process.env.NODE_ENV === 'production') {
    // 本番環境でSSL検証無効化を試みた場合は警告を出力（設定は無視される）
    if (process.env.DB_SSL_REJECT_UNAUTHORIZED?.toLowerCase() === 'false') {
      console.error(
        '[SECURITY] DB_SSL_REJECT_UNAUTHORIZED=false is ignored in production. ' +
          'SSL certificate verification is enforced for security.',
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
