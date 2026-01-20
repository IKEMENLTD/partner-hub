import { Throttle } from '@nestjs/throttler';

/**
 * SECURITY: Stricter rate limiting for authentication endpoints
 * - 5 login attempts per minute to prevent brute force attacks
 * - 3 registration attempts per minute to prevent spam
 */
export const ThrottleAuth = () =>
  Throttle({
    default: {
      ttl: 60000, // 1 minute
      limit: 5, // 5 attempts per minute for login
    },
  });

export const ThrottleRegister = () =>
  Throttle({
    default: {
      ttl: 60000, // 1 minute
      limit: 3, // 3 registration attempts per minute
    },
  });

export const ThrottlePasswordChange = () =>
  Throttle({
    default: {
      ttl: 60000, // 1 minute
      limit: 3, // 3 password change attempts per minute
    },
  });
