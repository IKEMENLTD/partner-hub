import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService, CreateAuditLogDto } from '../../modules/audit/audit.service';
import { AuditAction } from '../../modules/audit/entities/audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers, body, params } = request;

    // Skip GET requests (read operations)
    if (method === 'GET') {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async (responseData) => {
          try {
            const action = this.getActionFromMethod(method);
            const entityInfo = this.extractEntityInfo(url, params, body, responseData);

            if (entityInfo.entityName && entityInfo.entityId) {
              const auditLog: CreateAuditLogDto = {
                userId: user?.id || user?.sub,
                userEmail: user?.email,
                action,
                entityName: entityInfo.entityName,
                entityId: entityInfo.entityId,
                oldValue: method === 'DELETE' ? entityInfo.oldValue : undefined,
                newValue: ['POST', 'PUT', 'PATCH'].includes(method) ? this.sanitizeData(body) : undefined,
                metadata: {
                  url,
                  method,
                  duration: Date.now() - startTime,
                },
                ipAddress: ip,
                userAgent: headers['user-agent'],
              };

              await this.auditService.createLog(auditLog);
            }
          } catch (error) {
            this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
          }
        },
        error: (error) => {
          this.logger.debug(`Request failed, no audit log created: ${error.message}`);
        },
      }),
    );
  }

  private getActionFromMethod(method: string): AuditAction {
    switch (method) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return AuditAction.UPDATE;
    }
  }

  private extractEntityInfo(
    url: string,
    params: any,
    body: any,
    responseData: any,
  ): { entityName: string; entityId: string; oldValue?: any } {
    // Extract entity name from URL path
    const urlParts = url.split('/').filter(Boolean);
    const apiIndex = urlParts.indexOf('api');
    const entityName = apiIndex >= 0 && urlParts[apiIndex + 2]
      ? urlParts[apiIndex + 2]
      : urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];

    // Extract entity ID
    let entityId = params?.id || body?.id || responseData?.id || responseData?.data?.id;

    if (!entityId && typeof responseData === 'object') {
      entityId = responseData?.id || 'unknown';
    }

    return {
      entityName: this.normalizeEntityName(entityName),
      entityId: String(entityId || 'unknown'),
    };
  }

  private normalizeEntityName(name: string): string {
    // Remove trailing 's' for plural forms and capitalize
    const singular = name.endsWith('s') ? name.slice(0, -1) : name;
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
