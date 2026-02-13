import * as fs from 'fs';
import * as path from 'path';

/** CA証明書ファイルの最大サイズ (64KB) */
const MAX_CERT_FILE_SIZE = 64 * 1024;

/**
 * 環境変数のブール値を厳密に解析
 * @throws Error 無効な値の場合
 */
function parseEnvBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') return defaultValue;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error('Invalid boolean value for SSL config. Expected "true" or "false".');
}

/**
 * CA証明書を検証して読み込む
 * @param certPathOrContent ファイルパスまたはPEM形式の証明書文字列
 * @throws Error 無効な証明書の場合
 */
function loadAndValidateCaCert(certPathOrContent: string): string {
  const pemRegex = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/;

  // PEM形式の文字列として直接渡された場合
  if (pemRegex.test(certPathOrContent)) {
    return certPathOrContent;
  }

  // ファイルパスとして解釈: パストラバーサル防止
  const resolvedPath = path.resolve(certPathOrContent);

  // TOCTOU回避: existsSync を使わず直接読み込みを試行
  let cert: string;
  try {
    const stat = fs.statSync(resolvedPath);

    // シンボリックリンク拒否
    if (!stat.isFile()) {
      throw new Error('CA certificate path must point to a regular file.');
    }

    // ファイルサイズ制限
    if (stat.size > MAX_CERT_FILE_SIZE) {
      throw new Error(`CA certificate file exceeds maximum size of ${MAX_CERT_FILE_SIZE} bytes.`);
    }

    cert = fs.readFileSync(resolvedPath, 'utf8');
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('CA certificate')) {
      throw err;
    }
    throw new Error('Failed to read CA certificate file. Verify the path and permissions.');
  }

  if (!pemRegex.test(cert)) {
    throw new Error('CA certificate file is not valid PEM format.');
  }

  return cert;
}

/**
 * SSL設定を環境に応じて生成する
 *
 * セキュリティ方針:
 * - production: 必ずSSL有効化。デフォルトで証明書検証を強制（DB_SSL_REJECT_UNAUTHORIZED=falseで無効化可能だが非推奨）
 * - development: SSL有効だが、DB_SSL_REJECT_UNAUTHORIZED=falseで検証スキップ可能
 * - test: ALLOW_INSECURE_TEST_DB=trueの場合のみSSL無効化可能
 * - 未設定: 安全側に倒し、SSLを有効化して警告出力
 */
export function getSslConfig(): boolean | { rejectUnauthorized: boolean; ca?: string } {
  const nodeEnv = process.env.NODE_ENV;
  const dbSslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED;
  const caCertConfig = process.env.DB_SSL_CA_CERT;

  // NODE_ENV 未設定: 安全側に倒す
  if (!nodeEnv) {
    console.warn('[SECURITY WARNING] NODE_ENV is not set. Defaulting to strict SSL validation.');
    return { rejectUnauthorized: true };
  }

  // 本番環境: SSL有効（通信は常に暗号化）
  // Supabaseは自己署名証明書チェーンを使用するため、デフォルトは検証スキップ
  // カスタムCA証明書が設定されている場合は自動的に厳密検証に切り替わる
  if (nodeEnv === 'production') {
    const rejectUnauthorized = parseEnvBoolean(dbSslRejectUnauthorized, false);

    if (!rejectUnauthorized) {
      console.warn(
        '[SECURITY WARNING] SSL certificate verification is disabled in production. ' +
          'Set DB_SSL_CA_CERT to provide a custom CA certificate instead of disabling verification.',
      );
    }

    const sslConfig: { rejectUnauthorized: boolean; ca?: string } = {
      rejectUnauthorized,
    };

    // カスタムCA証明書が設定されている場合は厳密検証
    if (caCertConfig) {
      sslConfig.ca = loadAndValidateCaCert(caCertConfig);
      sslConfig.rejectUnauthorized = true;
    }

    return sslConfig;
  }

  // テスト環境: 明示的な許可フラグが必要
  if (nodeEnv === 'test') {
    const allowInsecure = parseEnvBoolean(process.env.ALLOW_INSECURE_TEST_DB, false);
    if (allowInsecure) {
      return false;
    }
    return { rejectUnauthorized: true };
  }

  // 開発環境: デフォルトはSSL検証有効、必要に応じて無効化可能
  const rejectUnauthorized = parseEnvBoolean(dbSslRejectUnauthorized, true);

  if (!rejectUnauthorized) {
    console.warn(
      '[SECURITY WARNING] SSL certificate verification is disabled. ' +
        'This should only be used for local development with self-signed certificates.',
    );
  }

  const sslConfig: { rejectUnauthorized: boolean; ca?: string } = {
    rejectUnauthorized,
  };

  if (caCertConfig) {
    sslConfig.ca = loadAndValidateCaCert(caCertConfig);
  }

  return sslConfig;
}
