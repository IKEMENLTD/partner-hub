import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
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
  action?: AuditAction;
  entityName?: string;
  startDate?: Date;
  endDate?: Date;
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
    const { page = 1, limit = 20, userId, action, entityName, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AuditLog> = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (entityName) {
      where.entityName = entityName;
    }

    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    }

    const [data, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByEntity(entityName: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entityName, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string, options?: { limit?: number }): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: options?.limit || 100,
    });
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getRecentLogs(limit: number = 50): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
