import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => {
  const redisUrl = process.env.REDIS_URL;

  // REDIS_URL が指定されている場合はパースして使用
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port, 10) || 6379,
        password: url.password || undefined,
        tls: url.protocol === 'rediss:' ? {} : undefined,
      };
    } catch {
      // パース失敗時はデフォルト値を使用
    }
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  };
});
