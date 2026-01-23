import { SetMetadata } from '@nestjs/common';
import { SKIP_AUDIT_KEY } from '../interceptors/audit.interceptor';

/**
 * Decorator to skip audit logging for specific endpoints
 * Use this for endpoints that should not be logged (e.g., health checks, metrics)
 */
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
