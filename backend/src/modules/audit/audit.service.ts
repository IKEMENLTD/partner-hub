import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

export interface CreateAuditLogDto {
  userId?: string;
  userEmail?: string;
  action: AuditAction;
  entityName: string;
  entityId: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FindAllOptions {
  page?: number;
  limit?: number;
  userId?: string;
  userEmail?: string;
  action?: AuditAction;
  entityName?: string;
  startDate?: Date;
  endDate?: Date;
  organizationId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async createLog(dto: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepository.create(dto);
      return await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Alias for createLog - matches the required interface
   */
  async createAuditLog(dto: CreateAuditLogDto): Promise<AuditLog> {
    return this.createLog(dto);
  }

  /**
   * Find all audit logs with pagination and filtering
   */
  async findAll(options: FindAllOptions = {}): Promise<PaginatedResult<AuditLog>> {
    const { page = 1, limit = 20, userId, userEmail, action, entityName, startDate, endDate, organizationId } = options;
    const skip = (page - 1) * limit;

    const qb = this.auditLogRepository.createQueryBuilder('audit');

    if (organizationId) {
      qb.andWhere(
        'audit.user_id IN (SELECT id FROM profiles WHERE organization_id = :organizationId)',
        { organizationId },
      );
    }

    if (userId) {
      qb.andWhere('audit.user_id = :userId', { userId });
    }

    if (userEmail) {
      qb.andWhere('audit.user_email ILIKE :userEmail', { userEmail: `%${userEmail}%` });
    }

    if (action) {
      qb.andWhere('audit.action = :action', { action });
    }

    if (entityName) {
      qb.andWhere('audit.entity_name = :entityName', { entityName });
    }

    if (startDate && endDate) {
      qb.andWhere('audit.created_at BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    qb.orderBy('audit.created_at', 'DESC');
    qb.skip(skip);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByEntity(entityName: string, entityId: string, organizationId?: string): Promise<AuditLog[]> {
    const qb = this.auditLogRepository.createQueryBuilder('audit');
    qb.where('audit.entity_name = :entityName', { entityName });
    qb.andWhere('audit.entity_id = :entityId', { entityId });

    if (organizationId) {
      qb.andWhere(
        'audit.user_id IN (SELECT id FROM profiles WHERE organization_id = :organizationId)',
        { organizationId },
      );
    }

    qb.orderBy('audit.created_at', 'DESC');
    return qb.getMany();
  }

  async findByUser(userId: string, options?: { limit?: number }, organizationId?: string): Promise<AuditLog[]> {
    const qb = this.auditLogRepository.createQueryBuilder('audit');
    qb.where('audit.user_id = :userId', { userId });

    if (organizationId) {
      qb.andWhere(
        'audit.user_id IN (SELECT id FROM profiles WHERE organization_id = :organizationId)',
        { organizationId },
      );
    }

    qb.orderBy('audit.created_at', 'DESC');
    qb.take(options?.limit || 100);
    return qb.getMany();
  }

  async findByDateRange(startDate: Date, endDate: Date, organizationId?: string): Promise<AuditLog[]> {
    const qb = this.auditLogRepository.createQueryBuilder('audit');
    qb.where('audit.created_at BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (organizationId) {
      qb.andWhere(
        'audit.user_id IN (SELECT id FROM profiles WHERE organization_id = :organizationId)',
        { organizationId },
      );
    }

    qb.orderBy('audit.created_at', 'DESC');
    return qb.getMany();
  }

  async getRecentLogs(limit: number = 50, organizationId?: string): Promise<AuditLog[]> {
    const qb = this.auditLogRepository.createQueryBuilder('audit');

    if (organizationId) {
      qb.where(
        'audit.user_id IN (SELECT id FROM profiles WHERE organization_id = :organizationId)',
        { organizationId },
      );
    }

    qb.orderBy('audit.created_at', 'DESC');
    qb.take(limit);
    return qb.getMany();
  }
}
