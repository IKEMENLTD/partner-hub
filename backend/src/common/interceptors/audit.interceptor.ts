import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuditService, CreateAuditLogDto } from '../../modules/audit/audit.service';
import { AuditAction } from '../../modules/audit/entities/audit-log.entity';

export const SKIP_AUDIT_KEY = 'skipAudit';

interface AuditRequest extends Request {
  user?: { id?: string; sub?: string; email?: string };
}

interface EntityInfo {
  entityName: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
}

interface ResponseData {
  id?: string;
  data?: { id?: string } & Record<string, unknown>;
  deletedEntity?: Record<string, unknown>;
  oldValue?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, headers, body, params } = request;

    // Check if audit should be skipped for this handler
    const skipAudit = this.reflector.get<boolean>(SKIP_AUDIT_KEY, context.getHandler());
    if (skipAudit) {
      return next.handle();
    }

    // Skip GET requests (read operations) - unless explicitly auditing reads
    if (method === 'GET') {
      return next.handle();
    }

    // Skip audit log endpoints to prevent infinite loops
    if (url.includes('/audit')) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async (responseData) => {
          try {
            const action = this.getActionFromMethod(method, url);
            const entityInfo = this.extractEntityInfo(url, params, body, responseData);

            if (entityInfo.entityName && entityInfo.entityId && entityInfo.entityId !== 'unknown') {
              const auditLog: CreateAuditLogDto = {
                userId: user?.id || user?.sub,
                userEmail: user?.email,
                action,
                entityName: entityInfo.entityName,
                entityId: entityInfo.entityId,
                oldValue: this.extractOldValue(method, responseData, entityInfo),
                newValue: this.extractNewValue(method, body, responseData),
                metadata: {
                  url,
                  method,
                  duration: Date.now() - startTime,
                  params: params ? { ...params } : undefined,
                  controllerClass: context.getClass()?.name,
                  handlerMethod: context.getHandler()?.name,
                },
                ipAddress: this.extractIpAddress(request),
                userAgent: headers['user-agent'],
              };

              await this.auditService.createLog(auditLog);
              this.logger.debug(
                `Audit log created for ${action} on ${entityInfo.entityName}:${entityInfo.entityId}`,
              );
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

  private extractIpAddress(request: AuditRequest): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedIp =
      typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined;
    return forwardedIp || (request.headers['x-real-ip'] as string) || request.ip || 'unknown';
  }

  private extractOldValue(
    method: string,
    responseData: ResponseData | undefined,
    entityInfo: EntityInfo,
  ): Record<string, unknown> | undefined {
    // For DELETE operations, try to capture the deleted entity data if available
    if (method === 'DELETE') {
      return entityInfo.oldValue || responseData?.deletedEntity || undefined;
    }
    // For UPDATE operations, capture the old value if it was included in the response
    if (method === 'PUT' || method === 'PATCH') {
      return responseData?.oldValue || responseData?.previousState || undefined;
    }
    return undefined;
  }

  private extractNewValue(
    method: string,
    body: Record<string, unknown>,
    responseData: ResponseData | undefined,
  ): Record<string, unknown> | undefined {
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      // Prefer the actual saved entity from response over the request body
      const newValue = responseData?.data || (responseData as Record<string, unknown> | undefined);
      return this.sanitizeData(newValue || body);
    }
    return undefined;
  }

  private getActionFromMethod(method: string, url: string): AuditAction {
    // Check for soft delete patterns in URL
    const isSoftDelete = url.includes('/soft-delete') || url.includes('/archive');

    switch (method) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        // Check if this is a soft delete operation
        if (isSoftDelete) {
          return AuditAction.SOFT_DELETE;
        }
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return AuditAction.UPDATE;
    }
  }

  private extractEntityInfo(
    url: string,
    params: Record<string, string> | undefined,
    body: Record<string, unknown>,
    responseData: ResponseData | undefined,
  ): EntityInfo {
    // Extract entity name from URL path
    const urlParts = url.split('/').filter(Boolean);
    const apiIndex = urlParts.indexOf('api');
    const entityName =
      apiIndex >= 0 && urlParts[apiIndex + 2]
        ? urlParts[apiIndex + 2]
        : urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];

    // Extract entity ID
    let entityId = params?.id || (body?.id as string) || responseData?.id || responseData?.data?.id;

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

  private sanitizeData(
    data: Record<string, unknown> | undefined,
  ): Record<string, unknown> | undefined {
    if (!data) return data;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'accessToken',
      'refreshToken',
    ];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
