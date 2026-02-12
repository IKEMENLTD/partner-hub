import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController', () => {
  let controller: AuditController;

  const mockAuditLog = {
    id: 'log-uuid-1',
    userId: 'user-1',
    action: 'CREATE',
    entityName: 'Project',
    entityId: 'proj-1',
    createdAt: new Date(),
  };

  const mockAuditService = {
    findAll: jest.fn(),
    findByEntity: jest.fn(),
    findByUser: jest.fn(),
    getRecentLogs: jest.fn(),
    findByDateRange: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated audit logs with default params', async () => {
      const expected = { data: [mockAuditLog], total: 1 };
      mockAuditService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(result).toEqual(expected);
      expect(mockAuditService.findAll).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        userId: undefined,
        userEmail: undefined,
        action: undefined,
        entityName: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should parse and pass query parameters', async () => {
      mockAuditService.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.findAll('2', '50', 'user-1', 'test@test.com', 'CREATE' as any, 'Project', '2024-01-01', '2024-12-31');

      expect(mockAuditService.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 50,
        userId: 'user-1',
        userEmail: 'test@test.com',
        action: 'CREATE',
        entityName: 'Project',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
    });
  });

  describe('findByEntity', () => {
    it('should return audit logs for a specific entity', async () => {
      mockAuditService.findByEntity.mockResolvedValue([mockAuditLog]);

      const result = await controller.findByEntity('Project', 'proj-1');

      expect(result).toEqual([mockAuditLog]);
      expect(mockAuditService.findByEntity).toHaveBeenCalledWith('Project', 'proj-1');
    });
  });

  describe('findByUser', () => {
    it('should return audit logs for a user with default limit', async () => {
      mockAuditService.findByUser.mockResolvedValue([mockAuditLog]);

      const result = await controller.findByUser('user-1', undefined);

      expect(result).toEqual([mockAuditLog]);
      expect(mockAuditService.findByUser).toHaveBeenCalledWith('user-1', { limit: undefined });
    });

    it('should return audit logs for a user with custom limit', async () => {
      mockAuditService.findByUser.mockResolvedValue([mockAuditLog]);

      await controller.findByUser('user-1', '50');

      expect(mockAuditService.findByUser).toHaveBeenCalledWith('user-1', { limit: 50 });
    });
  });

  describe('getRecentLogs', () => {
    it('should return recent logs with default limit', async () => {
      mockAuditService.getRecentLogs.mockResolvedValue([mockAuditLog]);

      const result = await controller.getRecentLogs(undefined);

      expect(result).toEqual([mockAuditLog]);
      expect(mockAuditService.getRecentLogs).toHaveBeenCalledWith(undefined);
    });

    it('should return recent logs with custom limit', async () => {
      mockAuditService.getRecentLogs.mockResolvedValue([]);

      await controller.getRecentLogs('25');

      expect(mockAuditService.getRecentLogs).toHaveBeenCalledWith(25);
    });
  });

  describe('findByDateRange', () => {
    it('should return audit logs within a date range', async () => {
      mockAuditService.findByDateRange.mockResolvedValue([mockAuditLog]);

      const result = await controller.findByDateRange('2024-01-01', '2024-12-31');

      expect(result).toEqual([mockAuditLog]);
      expect(mockAuditService.findByDateRange).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
    });
  });
});
