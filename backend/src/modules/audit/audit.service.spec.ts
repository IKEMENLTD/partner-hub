import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService, CreateAuditLogDto, FindAllOptions } from './audit.service';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;

  const now = new Date('2026-02-12T00:00:00Z');

  const mockAuditLog: Partial<AuditLog> = {
    id: 'audit-1',
    userId: 'user-1',
    userEmail: 'user@example.com',
    action: AuditAction.CREATE,
    entityName: 'Project',
    entityId: 'project-1',
    oldValue: undefined,
    newValue: { name: 'New Project' },
    metadata: { source: 'api' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: now,
  };

  // QueryBuilder mock
  let mockQueryBuilder: Record<string, jest.Mock>;

  const createMockQueryBuilder = () => {
    const qb: Record<string, jest.Mock> = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    return qb;
  };

  const mockAuditLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    mockQueryBuilder = createMockQueryBuilder();
    mockAuditLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
    mockAuditLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =============================================
  // createLog
  // =============================================

  describe('createLog', () => {
    const createDto: CreateAuditLogDto = {
      userId: 'user-1',
      userEmail: 'user@example.com',
      action: AuditAction.CREATE,
      entityName: 'Project',
      entityId: 'project-1',
      newValue: { name: 'New Project' },
      metadata: { source: 'api' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should create and save an audit log', async () => {
      const createdEntity = { ...mockAuditLog };
      mockAuditLogRepository.create.mockReturnValue(createdEntity);
      mockAuditLogRepository.save.mockResolvedValue(createdEntity);

      const result = await service.createLog(createDto);

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockAuditLogRepository.save).toHaveBeenCalledWith(createdEntity);
      expect(result).toEqual(createdEntity);
    });

    it('should create log with minimal required fields', async () => {
      const minimalDto: CreateAuditLogDto = {
        action: AuditAction.READ,
        entityName: 'Task',
        entityId: 'task-1',
      };
      const createdEntity = {
        id: 'audit-2',
        action: AuditAction.READ,
        entityName: 'Task',
        entityId: 'task-1',
        createdAt: now,
      };

      mockAuditLogRepository.create.mockReturnValue(createdEntity);
      mockAuditLogRepository.save.mockResolvedValue(createdEntity);

      const result = await service.createLog(minimalDto);

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(minimalDto);
      expect(result.entityName).toBe('Task');
      expect(result.entityId).toBe('task-1');
    });

    it('should create log with oldValue and newValue for UPDATE action', async () => {
      const updateDto: CreateAuditLogDto = {
        userId: 'user-1',
        action: AuditAction.UPDATE,
        entityName: 'Partner',
        entityId: 'partner-1',
        oldValue: { status: 'active' },
        newValue: { status: 'inactive' },
      };
      const createdEntity = { id: 'audit-3', ...updateDto, createdAt: now };

      mockAuditLogRepository.create.mockReturnValue(createdEntity);
      mockAuditLogRepository.save.mockResolvedValue(createdEntity);

      const result = await service.createLog(updateDto);

      expect(result.oldValue).toEqual({ status: 'active' });
      expect(result.newValue).toEqual({ status: 'inactive' });
    });

    it('should throw and log error when repository save fails', async () => {
      const error = new Error('Database connection failed');
      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockRejectedValue(error);

      await expect(service.createLog(createDto)).rejects.toThrow('Database connection failed');
    });

    it('should propagate the original error from repository', async () => {
      const error = new TypeError('Invalid column');
      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockRejectedValue(error);

      await expect(service.createLog(createDto)).rejects.toThrow(TypeError);
    });
  });

  // =============================================
  // createAuditLog (alias)
  // =============================================

  describe('createAuditLog', () => {
    it('should delegate to createLog', async () => {
      const dto: CreateAuditLogDto = {
        action: AuditAction.DELETE,
        entityName: 'Task',
        entityId: 'task-1',
        userId: 'user-1',
      };
      const createdEntity = { id: 'audit-4', ...dto, createdAt: now };

      mockAuditLogRepository.create.mockReturnValue(createdEntity);
      mockAuditLogRepository.save.mockResolvedValue(createdEntity);

      const result = await service.createAuditLog(dto);

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(dto);
      expect(mockAuditLogRepository.save).toHaveBeenCalledWith(createdEntity);
      expect(result).toEqual(createdEntity);
    });

    it('should propagate errors from createLog', async () => {
      const dto: CreateAuditLogDto = {
        action: AuditAction.CREATE,
        entityName: 'Partner',
        entityId: 'partner-1',
      };
      const error = new Error('Save failed');
      mockAuditLogRepository.create.mockReturnValue({});
      mockAuditLogRepository.save.mockRejectedValue(error);

      await expect(service.createAuditLog(dto)).rejects.toThrow('Save failed');
    });
  });

  // =============================================
  // findAll
  // =============================================

  describe('findAll', () => {
    it('should return paginated results with default options', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockAuditLog], 1]);

      const result = await service.findAll();

      expect(mockAuditLogRepository.createQueryBuilder).toHaveBeenCalledWith('audit');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('audit.created_at', 'DESC');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(result).toEqual({
        data: [mockAuditLog],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply pagination correctly', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 100]);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(10);
    });

    it('should calculate totalPages correctly with non-even division', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 25]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.totalPages).toBe(3); // Math.ceil(25 / 10) = 3
    });

    it('should filter by userId', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ userId: 'user-1' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.user_id = :userId',
        { userId: 'user-1' },
      );
    });

    it('should filter by userEmail with ILIKE pattern', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ userEmail: 'user@example.com' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.user_email ILIKE :userEmail',
        { userEmail: '%user@example.com%' },
      );
    });

    it('should filter by action', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ action: AuditAction.UPDATE });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.action = :action',
        { action: AuditAction.UPDATE },
      );
    });

    it('should filter by entityName', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ entityName: 'Project' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.entity_name = :entityName',
        { entityName: 'Project' },
      );
    });

    it('should filter by date range when both startDate and endDate are provided', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ startDate, endDate });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.created_at BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    });

    it('should not filter by date when only startDate is provided', async () => {
      const startDate = new Date('2026-01-01');
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ startDate });

      // Should not have been called with date range filter
      const andWhereCalls = mockQueryBuilder.andWhere.mock.calls;
      const dateFilterCalls = andWhereCalls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('BETWEEN'),
      );
      expect(dateFilterCalls).toHaveLength(0);
    });

    it('should not filter by date when only endDate is provided', async () => {
      const endDate = new Date('2026-01-31');
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ endDate });

      const andWhereCalls = mockQueryBuilder.andWhere.mock.calls;
      const dateFilterCalls = andWhereCalls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('BETWEEN'),
      );
      expect(dateFilterCalls).toHaveLength(0);
    });

    it('should filter by organizationId via user subquery', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ organizationId: 'org-uuid' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.user_id IN (SELECT id FROM profiles WHERE organization_id = :organizationId)',
        { organizationId: 'org-uuid' },
      );
    });

    it('should apply all filters simultaneously', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 2,
        limit: 5,
        userId: 'user-1',
        userEmail: 'test@example.com',
        action: AuditAction.CREATE,
        entityName: 'Partner',
        startDate,
        endDate,
        organizationId: 'org-uuid',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.user_id IN (SELECT id FROM profiles WHERE organization_id = :organizationId)',
        { organizationId: 'org-uuid' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.user_id = :userId',
        { userId: 'user-1' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.user_email ILIKE :userEmail',
        { userEmail: '%test@example.com%' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.action = :action',
        { action: AuditAction.CREATE },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.entity_name = :entityName',
        { entityName: 'Partner' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.created_at BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('should return empty data array when no logs found', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should return multiple results with correct pagination metadata', async () => {
      const logs = [
        { ...mockAuditLog, id: 'audit-1' },
        { ...mockAuditLog, id: 'audit-2' },
        { ...mockAuditLog, id: 'audit-3' },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([logs, 50]);

      const result = await service.findAll({ page: 2, limit: 3 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(50);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(3);
      expect(result.totalPages).toBe(17); // Math.ceil(50 / 3)
    });
  });

  // =============================================
  // findByEntity
  // =============================================

  describe('findByEntity', () => {
    it('should return audit logs for a specific entity', async () => {
      const logs = [
        { ...mockAuditLog, id: 'audit-1', action: AuditAction.CREATE },
        { ...mockAuditLog, id: 'audit-2', action: AuditAction.UPDATE },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(logs);

      const result = await service.findByEntity('Project', 'project-1');

      expect(mockAuditLogRepository.createQueryBuilder).toHaveBeenCalledWith('audit');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'audit.entity_name = :entityName',
        { entityName: 'Project' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.entity_id = :entityId',
        { entityId: 'project-1' },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('audit.created_at', 'DESC');
      expect(result).toHaveLength(2);
      expect(result).toEqual(logs);
    });

    it('should return empty array when no logs exist for entity', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findByEntity('Task', 'nonexistent-task');

      expect(result).toEqual([]);
    });

    it('should filter by organizationId when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findByEntity('Project', 'project-1', 'org-uuid');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.user_id IN (SELECT id FROM profiles WHERE organization_id = :organizationId)',
        { organizationId: 'org-uuid' },
      );
    });

    it('should return logs ordered by createdAt DESC', async () => {
      const olderLog = { ...mockAuditLog, id: 'audit-old', createdAt: new Date('2026-01-01') };
      const newerLog = { ...mockAuditLog, id: 'audit-new', createdAt: new Date('2026-02-01') };
      mockQueryBuilder.getMany.mockResolvedValue([newerLog, olderLog]);

      const result = await service.findByEntity('Partner', 'partner-1');

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('audit.created_at', 'DESC');
      expect(result[0].id).toBe('audit-new');
      expect(result[1].id).toBe('audit-old');
    });
  });

  // =============================================
  // findByUser
  // =============================================

  describe('findByUser', () => {
    it('should return audit logs for a specific user with default limit', async () => {
      const logs = [mockAuditLog as AuditLog];
      mockQueryBuilder.getMany.mockResolvedValue(logs);

      const result = await service.findByUser('user-1');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'audit.user_id = :userId',
        { userId: 'user-1' },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('audit.created_at', 'DESC');
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
      expect(result).toEqual(logs);
    });

    it('should apply custom limit', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findByUser('user-1', { limit: 10 });

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should use default limit of 100 when options is undefined', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findByUser('user-1', undefined);

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
    });

    it('should use default limit of 100 when limit is not provided in options', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findByUser('user-1', {});

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
    });

    it('should filter by organizationId when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findByUser('user-1', undefined, 'org-uuid');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.user_id IN (SELECT id FROM profiles WHERE organization_id = :organizationId)',
        { organizationId: 'org-uuid' },
      );
    });

    it('should return empty array when user has no audit logs', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findByUser('user-with-no-logs');

      expect(result).toEqual([]);
    });
  });

  // =============================================
  // findByDateRange
  // =============================================

  describe('findByDateRange', () => {
    it('should return audit logs within a date range', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      const logs = [mockAuditLog as AuditLog];
      mockQueryBuilder.getMany.mockResolvedValue(logs);

      const result = await service.findByDateRange(startDate, endDate);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'audit.created_at BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('audit.created_at', 'DESC');
      expect(result).toEqual(logs);
    });

    it('should return empty array when no logs exist in date range', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findByDateRange(startDate, endDate);

      expect(result).toEqual([]);
    });

    it('should handle same-day date range', async () => {
      const sameDay = new Date('2026-02-12');
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findByDateRange(sameDay, sameDay);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'audit.created_at BETWEEN :startDate AND :endDate',
        { startDate: sameDay, endDate: sameDay },
      );
    });

    it('should filter by organizationId when provided', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findByDateRange(startDate, endDate, 'org-uuid');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.user_id IN (SELECT id FROM profiles WHERE organization_id = :organizationId)',
        { organizationId: 'org-uuid' },
      );
    });

    it('should return results ordered by createdAt DESC', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findByDateRange(startDate, endDate);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('audit.created_at', 'DESC');
    });
  });

  // =============================================
  // getRecentLogs
  // =============================================

  describe('getRecentLogs', () => {
    it('should return recent logs with default limit of 50', async () => {
      const logs = Array.from({ length: 50 }, (_, i) => ({
        ...mockAuditLog,
        id: `audit-${i}`,
      }));
      mockQueryBuilder.getMany.mockResolvedValue(logs);

      const result = await service.getRecentLogs();

      expect(mockAuditLogRepository.createQueryBuilder).toHaveBeenCalledWith('audit');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('audit.created_at', 'DESC');
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
      expect(result).toHaveLength(50);
    });

    it('should accept a custom limit', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getRecentLogs(10);

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should return empty array when no logs exist', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getRecentLogs();

      expect(result).toEqual([]);
    });

    it('should accept limit of 1', async () => {
      const singleLog = [mockAuditLog as AuditLog];
      mockQueryBuilder.getMany.mockResolvedValue(singleLog);

      const result = await service.getRecentLogs(1);

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(1);
    });

    it('should filter by organizationId when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getRecentLogs(50, 'org-uuid');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'audit.user_id IN (SELECT id FROM profiles WHERE organization_id = :organizationId)',
        { organizationId: 'org-uuid' },
      );
    });

    it('should return results ordered by createdAt DESC', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getRecentLogs(25);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('audit.created_at', 'DESC');
    });
  });

  // =============================================
  // All AuditAction types
  // =============================================

  describe('audit actions coverage', () => {
    it.each([
      AuditAction.CREATE,
      AuditAction.READ,
      AuditAction.UPDATE,
      AuditAction.DELETE,
      AuditAction.SOFT_DELETE,
    ])('should create log with action %s', async (action) => {
      const dto: CreateAuditLogDto = {
        action,
        entityName: 'TestEntity',
        entityId: 'entity-1',
      };
      const createdEntity = { id: 'audit-x', ...dto, createdAt: now };

      mockAuditLogRepository.create.mockReturnValue(createdEntity);
      mockAuditLogRepository.save.mockResolvedValue(createdEntity);

      const result = await service.createLog(dto);

      expect(result.action).toBe(action);
    });
  });
});
