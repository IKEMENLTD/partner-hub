import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export default registerAs('jwt', (): JwtConfig => {
  // SECURITY FIX: Require JWT secrets in production - no fallback defaults
  const nodeEnv = process.env.NODE_ENV || 'development';
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (nodeEnv === 'production') {
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error(
        'SECURITY ERROR: JWT_SECRET must be set and at least 32 characters in production',
      );
    }
    if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
      throw new Error(
        'SECURITY ERROR: JWT_REFRESH_SECRET must be set and at least 32 characters in production',
      );
    }
  }

  // For development only - warn if using defaults
  if (!jwtSecret && nodeEnv !== 'production') {
    console.warn(
      'WARNING: Using development JWT_SECRET. Set a secure secret for production!',
    );
  }

  return {
    secret: jwtSecret || (nodeEnv !== 'production' ? 'dev_jwt_secret_not_for_production_use' : ''),
    expiresIn: process.env.JWT_EXPIRES_IN || '15m', // SECURITY FIX: Reduced from 1d to 15m
    refreshSecret: jwtRefreshSecret || (nodeEnv !== 'production' ? 'dev_refresh_secret_not_for_production_use' : ''),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };
});
