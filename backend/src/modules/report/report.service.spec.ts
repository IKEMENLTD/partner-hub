import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportService } from './report.service';
import { ReportConfigService } from './services/report-config.service';
import { ReportDataService } from './services/report-data.service';
import {
  GeneratedReport,
  GeneratedReportStatus,
  ReportData,
} from './entities/generated-report.entity';
import { ReportConfig, ReportPeriod, ReportStatus } from './entities/report-config.entity';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import {
  CreateReportConfigDto,
  UpdateReportConfigDto,
  QueryReportConfigDto,
  QueryGeneratedReportDto,
  GenerateReportDto,
} from './dto';

describe('ReportService', () => {
  let service: ReportService;
  let generatedReportRepository: Record<string, jest.Mock>;
  let reportConfigService: Record<string, jest.Mock>;
  let reportDataService: Record<string, jest.Mock>;

  const now = new Date('2026-02-12T00:00:00Z');

  // ==================== Mock Data ====================

  const mockReportConfig: Partial<ReportConfig> = {
    id: 'config-1',
    name: 'Weekly Project Summary',
    description: 'Weekly summary of all active projects',
    period: ReportPeriod.WEEKLY,
    status: ReportStatus.ACTIVE,
    scheduleCron: '0 9 * * 1',
    dayOfWeek: 1,
    dayOfMonth: 1,
    sendTime: '09:00',
    recipients: ['user@example.com'],
    includeProjectSummary: true,
    includeTaskSummary: true,
    includePartnerPerformance: true,
    includeHighlights: true,
    createdById: 'user-1',
    organizationId: 'org-1',
    createdAt: now,
    updatedAt: now,
  };

  const mockReportData: ReportData = {
    period: ReportPeriod.WEEKLY,
    dateRange: { start: '2026-02-05', end: '2026-02-12' },
    projectSummary: {
      total: 10,
      active: 5,
      completed: 3,
      delayed: 2,
      byStatus: { in_progress: 5, completed: 3, planning: 2 },
    },
    taskSummary: {
      total: 50,
      completed: 30,
      inProgress: 15,
      overdue: 5,
      completionRate: 60,
      byPriority: { high: 10, medium: 25, low: 15 },
    },
    partnerPerformance: [
      {
        partnerId: 'partner-1',
        partnerName: 'Partner A',
        activeProjects: 3,
        tasksCompleted: 10,
        tasksTotal: 15,
        onTimeDeliveryRate: 80,
        rating: 4.5,
      },
    ],
    highlights: {
      keyAchievements: ['案件「Project A」が完了しました'],
      issues: ['3件のタスクが期限超過しています'],
      upcomingDeadlines: [
        {
          type: 'project',
          id: 'project-1',
          name: 'Project B',
          dueDate: '2026-02-15',
          daysRemaining: 3,
        },
      ],
    },
    healthScoreStats: {
      averageScore: 75,
      projectsAtRisk: 2,
      totalProjects: 8,
    },
  };

  const mockGeneratedReport: Partial<GeneratedReport> = {
    id: 'report-1',
    reportConfigId: 'config-1',
    title: '週次レポート (2026-02-05 - 2026-02-12)',
    period: ReportPeriod.WEEKLY,
    dateRangeStart: new Date('2026-02-05'),
    dateRangeEnd: new Date('2026-02-12'),
    status: GeneratedReportStatus.GENERATED,
    reportData: mockReportData,
    isManual: true,
    generatedById: 'user-1',
    createdAt: now,
  };

  // ==================== Mock Factories ====================

  const mockGeneratedReportRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockReportConfigService = {
    createConfig: jest.fn(),
    findAllConfigs: jest.fn(),
    findConfigById: jest.fn(),
    updateConfig: jest.fn(),
    deleteConfig: jest.fn(),
    getActiveConfigsForScheduling: jest.fn(),
    markConfigAsRun: jest.fn(),
    recalculateAllNextRunTimes: jest.fn(),
  };

  const mockReportDataService = {
    gatherReportData: jest.fn(),
  };

  // ==================== Test Setup ====================

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: getRepositoryToken(GeneratedReport),
          useValue: mockGeneratedReportRepository,
        },
        {
          provide: ReportConfigService,
          useValue: mockReportConfigService,
        },
        {
          provide: ReportDataService,
          useValue: mockReportDataService,
        },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    generatedReportRepository = module.get(getRepositoryToken(GeneratedReport));
    reportConfigService = module.get(ReportConfigService);
    reportDataService = module.get(ReportDataService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =============================================
  // createConfig (delegated)
  // =============================================

  describe('createConfig', () => {
    const createDto: CreateReportConfigDto = {
      name: 'Weekly Project Summary',
      description: 'Weekly summary',
      period: ReportPeriod.WEEKLY,
      recipients: ['user@example.com'],
    };

    it('should delegate to reportConfigService.createConfig', async () => {
      mockReportConfigService.createConfig.mockResolvedValue(mockReportConfig);

      const result = await service.createConfig(createDto, 'user-1');

      expect(mockReportConfigService.createConfig).toHaveBeenCalledWith(createDto, 'user-1', undefined);
      expect(result).toEqual(mockReportConfig);
    });

    it('should propagate errors from reportConfigService', async () => {
      const error = new Error('Database error');
      mockReportConfigService.createConfig.mockRejectedValue(error);

      await expect(service.createConfig(createDto, 'user-1')).rejects.toThrow('Database error');
    });
  });

  // =============================================
  // findAllConfigs (delegated)
  // =============================================

  describe('findAllConfigs', () => {
    it('should delegate to reportConfigService.findAllConfigs', async () => {
      const queryDto: QueryReportConfigDto = { page: 1, limit: 10 };
      const paginatedResult = new PaginatedResponseDto([mockReportConfig], 1, 1, 10);
      mockReportConfigService.findAllConfigs.mockResolvedValue(paginatedResult);

      const result = await service.findAllConfigs(queryDto);

      expect(mockReportConfigService.findAllConfigs).toHaveBeenCalledWith(queryDto, undefined);
      expect(result).toEqual(paginatedResult);
    });

    it('should pass all query parameters through', async () => {
      const queryDto: QueryReportConfigDto = {
        page: 2,
        limit: 5,
        period: ReportPeriod.MONTHLY,
        status: ReportStatus.ACTIVE,
        search: 'weekly',
        sortBy: 'name',
        sortOrder: 'ASC',
      };
      const paginatedResult = new PaginatedResponseDto([], 0, 2, 5);
      mockReportConfigService.findAllConfigs.mockResolvedValue(paginatedResult);

      const result = await service.findAllConfigs(queryDto);

      expect(mockReportConfigService.findAllConfigs).toHaveBeenCalledWith(queryDto, undefined);
      expect(result).toEqual(paginatedResult);
    });

    it('should propagate errors from reportConfigService', async () => {
      mockReportConfigService.findAllConfigs.mockRejectedValue(new Error('Query failed'));

      await expect(service.findAllConfigs({})).rejects.toThrow('Query failed');
    });
  });

  // =============================================
  // findConfigById (delegated)
  // =============================================

  describe('findConfigById', () => {
    it('should delegate to reportConfigService.findConfigById', async () => {
      mockReportConfigService.findConfigById.mockResolvedValue(mockReportConfig);

      const result = await service.findConfigById('config-1');

      expect(mockReportConfigService.findConfigById).toHaveBeenCalledWith('config-1', undefined);
      expect(result).toEqual(mockReportConfig);
    });

    it('should propagate ResourceNotFoundException when config not found', async () => {
      mockReportConfigService.findConfigById.mockRejectedValue(
        new ResourceNotFoundException('REPORT_001', {
          resourceType: 'ReportConfig',
          resourceId: 'nonexistent',
        }),
      );

      await expect(service.findConfigById('nonexistent')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  // =============================================
  // updateConfig (delegated)
  // =============================================

  describe('updateConfig', () => {
    it('should delegate to reportConfigService.updateConfig', async () => {
      const updateDto: UpdateReportConfigDto = { name: 'Updated Name' };
      const updatedConfig = { ...mockReportConfig, name: 'Updated Name' };
      mockReportConfigService.updateConfig.mockResolvedValue(updatedConfig);

      const result = await service.updateConfig('config-1', updateDto);

      expect(mockReportConfigService.updateConfig).toHaveBeenCalledWith('config-1', updateDto, undefined);
      expect(result).toEqual(updatedConfig);
    });

    it('should propagate errors for non-existent config', async () => {
      const updateDto: UpdateReportConfigDto = { name: 'Updated Name' };
      mockReportConfigService.updateConfig.mockRejectedValue(
        new ResourceNotFoundException('REPORT_001', {
          resourceType: 'ReportConfig',
          resourceId: 'nonexistent',
        }),
      );

      await expect(service.updateConfig('nonexistent', updateDto)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should pass status update through', async () => {
      const updateDto: UpdateReportConfigDto = { status: ReportStatus.PAUSED };
      const updatedConfig = { ...mockReportConfig, status: ReportStatus.PAUSED };
      mockReportConfigService.updateConfig.mockResolvedValue(updatedConfig);

      const result = await service.updateConfig('config-1', updateDto);

      expect(mockReportConfigService.updateConfig).toHaveBeenCalledWith('config-1', updateDto, undefined);
      expect(result.status).toBe(ReportStatus.PAUSED);
    });
  });

  // =============================================
  // deleteConfig (delegated)
  // =============================================

  describe('deleteConfig', () => {
    it('should delegate to reportConfigService.deleteConfig', async () => {
      mockReportConfigService.deleteConfig.mockResolvedValue(undefined);

      await service.deleteConfig('config-1');

      expect(mockReportConfigService.deleteConfig).toHaveBeenCalledWith('config-1', undefined);
    });

    it('should propagate errors for non-existent config', async () => {
      mockReportConfigService.deleteConfig.mockRejectedValue(
        new ResourceNotFoundException('REPORT_001', {
          resourceType: 'ReportConfig',
          resourceId: 'nonexistent',
        }),
      );

      await expect(service.deleteConfig('nonexistent')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  // =============================================
  // getActiveConfigsForScheduling (delegated)
  // =============================================

  describe('getActiveConfigsForScheduling', () => {
    it('should delegate to reportConfigService.getActiveConfigsForScheduling', async () => {
      const activeConfigs = [mockReportConfig as ReportConfig];
      mockReportConfigService.getActiveConfigsForScheduling.mockResolvedValue(activeConfigs);

      const result = await service.getActiveConfigsForScheduling();

      expect(mockReportConfigService.getActiveConfigsForScheduling).toHaveBeenCalled();
      expect(result).toEqual(activeConfigs);
    });

    it('should return empty array when no active configs', async () => {
      mockReportConfigService.getActiveConfigsForScheduling.mockResolvedValue([]);

      const result = await service.getActiveConfigsForScheduling();

      expect(result).toEqual([]);
    });
  });

  // =============================================
  // markConfigAsRun (delegated)
  // =============================================

  describe('markConfigAsRun', () => {
    it('should delegate to reportConfigService.markConfigAsRun', async () => {
      mockReportConfigService.markConfigAsRun.mockResolvedValue(undefined);

      await service.markConfigAsRun('config-1');

      expect(mockReportConfigService.markConfigAsRun).toHaveBeenCalledWith('config-1');
    });

    it('should propagate errors from reportConfigService', async () => {
      mockReportConfigService.markConfigAsRun.mockRejectedValue(
        new ResourceNotFoundException('REPORT_001', {
          resourceType: 'ReportConfig',
          resourceId: 'nonexistent',
        }),
      );

      await expect(service.markConfigAsRun('nonexistent')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  // =============================================
  // recalculateAllNextRunTimes (delegated)
  // =============================================

  describe('recalculateAllNextRunTimes', () => {
    it('should delegate to reportConfigService.recalculateAllNextRunTimes', async () => {
      mockReportConfigService.recalculateAllNextRunTimes.mockResolvedValue(5);

      const result = await service.recalculateAllNextRunTimes();

      expect(mockReportConfigService.recalculateAllNextRunTimes).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('should return 0 when no configs exist', async () => {
      mockReportConfigService.recalculateAllNextRunTimes.mockResolvedValue(0);

      const result = await service.recalculateAllNextRunTimes();

      expect(result).toBe(0);
    });
  });

  // =============================================
  // findAllGeneratedReports
  // =============================================

  describe('findAllGeneratedReports', () => {
    let mockQueryBuilder: Record<string, jest.Mock>;

    beforeEach(() => {
      mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockGeneratedReportRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should return paginated results with default options', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockGeneratedReport], 1]);

      const result = await service.findAllGeneratedReports({});

      expect(mockGeneratedReportRepository.createQueryBuilder).toHaveBeenCalledWith('report');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'report.reportConfig',
        'reportConfig',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'report.generatedBy',
        'generatedBy',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('report.createdAt', 'DESC');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.data).toEqual([mockGeneratedReport]);
      expect(result.pagination.total).toBe(1);
    });

    it('should apply pagination correctly', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 50]);

      const result = await service.findAllGeneratedReports({ page: 3, limit: 5 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // (3-1) * 5
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.offset).toBe(10);
    });

    it('should filter by reportConfigId', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllGeneratedReports({ reportConfigId: 'config-1' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'report.reportConfigId = :reportConfigId',
        { reportConfigId: 'config-1' },
      );
    });

    it('should filter by period', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllGeneratedReports({ period: ReportPeriod.MONTHLY });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('report.period = :period', {
        period: ReportPeriod.MONTHLY,
      });
    });

    it('should filter by status', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllGeneratedReports({ status: GeneratedReportStatus.SENT });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('report.status = :status', {
        status: GeneratedReportStatus.SENT,
      });
    });

    it('should filter by fromDate', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllGeneratedReports({ fromDate: '2026-01-01' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'report.createdAt >= :fromDate',
        { fromDate: '2026-01-01' },
      );
    });

    it('should filter by toDate', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllGeneratedReports({ toDate: '2026-12-31' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'report.createdAt <= :toDate',
        { toDate: '2026-12-31' },
      );
    });

    it('should apply all filters simultaneously', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllGeneratedReports({
        page: 2,
        limit: 5,
        reportConfigId: 'config-1',
        period: ReportPeriod.WEEKLY,
        status: GeneratedReportStatus.GENERATED,
        fromDate: '2026-01-01',
        toDate: '2026-12-31',
        sortBy: 'title',
        sortOrder: 'ASC',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'report.reportConfigId = :reportConfigId',
        { reportConfigId: 'config-1' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('report.period = :period', {
        period: ReportPeriod.WEEKLY,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('report.status = :status', {
        status: GeneratedReportStatus.GENERATED,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'report.createdAt >= :fromDate',
        { fromDate: '2026-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'report.createdAt <= :toDate',
        { toDate: '2026-12-31' },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('report.title', 'ASC');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('should not apply optional filters when not provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllGeneratedReports({});

      // andWhere should not be called when no filters are provided
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should return empty data array when no reports found', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAllGeneratedReports({});

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should return multiple results with correct pagination metadata', async () => {
      const reports = [
        { ...mockGeneratedReport, id: 'report-1' },
        { ...mockGeneratedReport, id: 'report-2' },
        { ...mockGeneratedReport, id: 'report-3' },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([reports, 50]);

      const result = await service.findAllGeneratedReports({ page: 2, limit: 3 });

      expect(result.data).toHaveLength(3);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.offset).toBe(3); // (2-1) * 3
      expect(result.pagination.hasMore).toBe(true); // 3 + 3 < 50
    });

    it('should handle hasMore=false on last page', async () => {
      const reports = [{ ...mockGeneratedReport, id: 'report-1' }];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([reports, 1]);

      const result = await service.findAllGeneratedReports({ page: 1, limit: 10 });

      expect(result.pagination.hasMore).toBe(false); // 0 + 1 >= 1
    });

    it('should use default sortBy and sortOrder when not provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllGeneratedReports({});

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('report.createdAt', 'DESC');
    });

    it('should accept custom sortBy and sortOrder', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllGeneratedReports({ sortBy: 'title', sortOrder: 'ASC' });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('report.title', 'ASC');
    });
  });

  // =============================================
  // findGeneratedReportById
  // =============================================

  describe('findGeneratedReportById', () => {
    it('should return a generated report by id', async () => {
      mockGeneratedReportRepository.findOne.mockResolvedValue(mockGeneratedReport);

      const result = await service.findGeneratedReportById('report-1');

      expect(mockGeneratedReportRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        relations: ['reportConfig', 'generatedBy'],
      });
      expect(result).toEqual(mockGeneratedReport);
    });

    it('should throw ResourceNotFoundException when report not found', async () => {
      mockGeneratedReportRepository.findOne.mockResolvedValue(null);

      await expect(service.findGeneratedReportById('nonexistent')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should throw ResourceNotFoundException with correct factory info', async () => {
      mockGeneratedReportRepository.findOne.mockResolvedValue(null);

      try {
        await service.findGeneratedReportById('report-missing');
        fail('Expected ResourceNotFoundException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ResourceNotFoundException);
        expect((error as ResourceNotFoundException).resourceType).toBe('Report');
        expect((error as ResourceNotFoundException).resourceId).toBe('report-missing');
      }
    });

    it('should include reportConfig and generatedBy relations', async () => {
      mockGeneratedReportRepository.findOne.mockResolvedValue(mockGeneratedReport);

      await service.findGeneratedReportById('report-1');

      expect(mockGeneratedReportRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['reportConfig', 'generatedBy'],
        }),
      );
    });
  });

  // =============================================
  // generateReport
  // =============================================

  describe('generateReport', () => {
    it('should generate a weekly report with explicit date range', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
        startDate: '2026-02-05',
        endDate: '2026-02-12',
        reportConfigId: 'config-1',
      };

      const createdReport = {
        ...mockGeneratedReport,
        id: 'report-new',
      };

      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      mockGeneratedReportRepository.create.mockReturnValue(createdReport);
      mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
      mockGeneratedReportRepository.findOne.mockResolvedValue(createdReport);

      const result = await service.generateReport(dto, 'user-1');

      expect(mockReportDataService.gatherReportData).toHaveBeenCalledWith(
        new Date('2026-02-05'),
        new Date('2026-02-12'),
        undefined,
      );
      expect(mockGeneratedReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reportConfigId: 'config-1',
          period: ReportPeriod.WEEKLY,
          dateRangeStart: new Date('2026-02-05'),
          dateRangeEnd: new Date('2026-02-12'),
          status: GeneratedReportStatus.GENERATED,
          reportData: mockReportData,
          isManual: true,
          generatedById: 'user-1',
        }),
      );
      expect(mockGeneratedReportRepository.save).toHaveBeenCalledWith(createdReport);
      expect(result).toEqual(createdReport);
    });

    it('should generate a monthly report with explicit date range', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.MONTHLY,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      };

      const createdReport = {
        ...mockGeneratedReport,
        id: 'report-monthly',
        period: ReportPeriod.MONTHLY,
        title: '月次レポート (2026-01-01 - 2026-01-31)',
      };

      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      mockGeneratedReportRepository.create.mockReturnValue(createdReport);
      mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
      mockGeneratedReportRepository.findOne.mockResolvedValue(createdReport);

      const result = await service.generateReport(dto);

      expect(mockGeneratedReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          period: ReportPeriod.MONTHLY,
          title: '月次レポート (2026-01-01 - 2026-01-31)',
        }),
      );
      expect(result).toEqual(createdReport);
    });

    it('should generate a weekly report title in Japanese', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
        startDate: '2026-02-05',
        endDate: '2026-02-12',
      };

      const createdReport = { ...mockGeneratedReport, id: 'report-weekly' };

      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      mockGeneratedReportRepository.create.mockReturnValue(createdReport);
      mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
      mockGeneratedReportRepository.findOne.mockResolvedValue(createdReport);

      await service.generateReport(dto);

      expect(mockGeneratedReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '週次レポート (2026-02-05 - 2026-02-12)',
        }),
      );
    });

    it('should generate a monthly report title in Japanese', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.MONTHLY,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      };

      const createdReport = { ...mockGeneratedReport, id: 'report-monthly' };

      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      mockGeneratedReportRepository.create.mockReturnValue(createdReport);
      mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
      mockGeneratedReportRepository.findOne.mockResolvedValue(createdReport);

      await service.generateReport(dto);

      expect(mockGeneratedReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '月次レポート (2026-01-01 - 2026-01-31)',
        }),
      );
    });

    it('should default to WEEKLY period when not specified', async () => {
      const dto: GenerateReportDto = {
        startDate: '2026-02-05',
        endDate: '2026-02-12',
      };

      const createdReport = { ...mockGeneratedReport, id: 'report-default' };

      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      mockGeneratedReportRepository.create.mockReturnValue(createdReport);
      mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
      mockGeneratedReportRepository.findOne.mockResolvedValue(createdReport);

      await service.generateReport(dto);

      expect(mockGeneratedReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          period: ReportPeriod.WEEKLY,
        }),
      );
    });

    it('should calculate date range automatically when dates not provided (weekly)', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
      };

      const createdReport = { ...mockGeneratedReport, id: 'report-auto' };

      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      mockGeneratedReportRepository.create.mockReturnValue(createdReport);
      mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
      mockGeneratedReportRepository.findOne.mockResolvedValue(createdReport);

      await service.generateReport(dto);

      // Verify gatherReportData was called with dates (auto-calculated)
      expect(mockReportDataService.gatherReportData).toHaveBeenCalled();
      const [startArg, endArg] = mockReportDataService.gatherReportData.mock.calls[0];

      // Start date should be 7 calendar days before end date
      // end is today at 23:59:59.999, start is (today - 7 days) at 00:00:00.000
      // So the actual time difference is ~7 days + 23:59:59.999
      const startDateOnly = new Date(startArg);
      startDateOnly.setHours(0, 0, 0, 0);
      const endDateOnly = new Date(endArg);
      endDateOnly.setHours(0, 0, 0, 0);
      const calendarDayDiff = Math.round(
        (endDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(calendarDayDiff).toBe(7);

      // Start time should be 00:00:00.000
      expect(startArg.getHours()).toBe(0);
      expect(startArg.getMinutes()).toBe(0);
      expect(startArg.getSeconds()).toBe(0);
      expect(startArg.getMilliseconds()).toBe(0);

      // End time should be 23:59:59.999
      expect(endArg.getHours()).toBe(23);
      expect(endArg.getMinutes()).toBe(59);
      expect(endArg.getSeconds()).toBe(59);
      expect(endArg.getMilliseconds()).toBe(999);
    });

    it('should calculate date range automatically when dates not provided (monthly)', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.MONTHLY,
      };

      const createdReport = { ...mockGeneratedReport, id: 'report-auto-monthly' };

      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      mockGeneratedReportRepository.create.mockReturnValue(createdReport);
      mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
      mockGeneratedReportRepository.findOne.mockResolvedValue(createdReport);

      await service.generateReport(dto);

      expect(mockReportDataService.gatherReportData).toHaveBeenCalled();
      const [startArg, endArg] = mockReportDataService.gatherReportData.mock.calls[0];

      // For monthly, start date should be roughly 28-31 calendar days before end date
      // Compare dates at midnight to get calendar day difference
      const startDateOnly = new Date(startArg);
      startDateOnly.setHours(0, 0, 0, 0);
      const endDateOnly = new Date(endArg);
      endDateOnly.setHours(0, 0, 0, 0);
      const calendarDayDiff = Math.round(
        (endDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(calendarDayDiff).toBeGreaterThanOrEqual(28);
      expect(calendarDayDiff).toBeLessThanOrEqual(31);
    });

    it('should generate report without generatedById (scheduled report)', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
        startDate: '2026-02-05',
        endDate: '2026-02-12',
      };

      const createdReport = {
        ...mockGeneratedReport,
        id: 'report-scheduled',
        generatedById: undefined,
      };

      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      mockGeneratedReportRepository.create.mockReturnValue(createdReport);
      mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
      mockGeneratedReportRepository.findOne.mockResolvedValue(createdReport);

      await service.generateReport(dto);

      expect(mockGeneratedReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          generatedById: undefined,
        }),
      );
    });

    it('should fetch the full report with relations after saving', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
        startDate: '2026-02-05',
        endDate: '2026-02-12',
      };

      const createdReport = { ...mockGeneratedReport, id: 'report-new' };
      const fullReport = {
        ...createdReport,
        reportConfig: mockReportConfig,
        generatedBy: { id: 'user-1', email: 'user@example.com' },
      };

      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      mockGeneratedReportRepository.create.mockReturnValue(createdReport);
      mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
      mockGeneratedReportRepository.findOne.mockResolvedValue(fullReport);

      const result = await service.generateReport(dto, 'user-1');

      expect(mockGeneratedReportRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'report-new' },
        relations: ['reportConfig', 'generatedBy'],
      });
      expect(result).toEqual(fullReport);
    });

    it('should propagate errors from reportDataService', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
        startDate: '2026-02-05',
        endDate: '2026-02-12',
      };

      mockReportDataService.gatherReportData.mockRejectedValue(
        new Error('Data gathering failed'),
      );

      await expect(service.generateReport(dto, 'user-1')).rejects.toThrow(
        'Data gathering failed',
      );
    });

    it('should propagate errors from repository save', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
        startDate: '2026-02-05',
        endDate: '2026-02-12',
      };

      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      mockGeneratedReportRepository.create.mockReturnValue(mockGeneratedReport);
      mockGeneratedReportRepository.save.mockRejectedValue(new Error('Save failed'));

      await expect(service.generateReport(dto, 'user-1')).rejects.toThrow('Save failed');
    });

    it('should set isManual to true', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
        startDate: '2026-02-05',
        endDate: '2026-02-12',
      };

      const createdReport = { ...mockGeneratedReport, id: 'report-manual' };

      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      mockGeneratedReportRepository.create.mockReturnValue(createdReport);
      mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
      mockGeneratedReportRepository.findOne.mockResolvedValue(createdReport);

      await service.generateReport(dto);

      expect(mockGeneratedReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isManual: true,
        }),
      );
    });

    it('should set status to GENERATED', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
        startDate: '2026-02-05',
        endDate: '2026-02-12',
      };

      const createdReport = { ...mockGeneratedReport, id: 'report-status' };

      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      mockGeneratedReportRepository.create.mockReturnValue(createdReport);
      mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
      mockGeneratedReportRepository.findOne.mockResolvedValue(createdReport);

      await service.generateReport(dto);

      expect(mockGeneratedReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: GeneratedReportStatus.GENERATED,
        }),
      );
    });

    it('should pass reportConfigId through when provided', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
        startDate: '2026-02-05',
        endDate: '2026-02-12',
        reportConfigId: 'config-abc',
      };

      const createdReport = { ...mockGeneratedReport, id: 'report-with-config' };

      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      mockGeneratedReportRepository.create.mockReturnValue(createdReport);
      mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
      mockGeneratedReportRepository.findOne.mockResolvedValue(createdReport);

      await service.generateReport(dto);

      expect(mockGeneratedReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reportConfigId: 'config-abc',
        }),
      );
    });

    it('should handle undefined reportConfigId', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
        startDate: '2026-02-05',
        endDate: '2026-02-12',
      };

      const createdReport = { ...mockGeneratedReport, id: 'report-no-config' };

      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      mockGeneratedReportRepository.create.mockReturnValue(createdReport);
      mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
      mockGeneratedReportRepository.findOne.mockResolvedValue(createdReport);

      await service.generateReport(dto);

      expect(mockGeneratedReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reportConfigId: undefined,
        }),
      );
    });
  });

  // =============================================
  // gatherReportData (delegated)
  // =============================================

  describe('gatherReportData', () => {
    it('should delegate to reportDataService.gatherReportData', async () => {
      const startDate = new Date('2026-02-05');
      const endDate = new Date('2026-02-12');
      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);

      const result = await service.gatherReportData(startDate, endDate);

      expect(mockReportDataService.gatherReportData).toHaveBeenCalledWith(startDate, endDate, undefined);
      expect(result).toEqual(mockReportData);
    });

    it('should propagate errors from reportDataService', async () => {
      const startDate = new Date('2026-02-05');
      const endDate = new Date('2026-02-12');
      mockReportDataService.gatherReportData.mockRejectedValue(
        new Error('Data gathering failed'),
      );

      await expect(service.gatherReportData(startDate, endDate)).rejects.toThrow(
        'Data gathering failed',
      );
    });
  });

  // =============================================
  // calculateDateRange (private, tested via generateReport)
  // =============================================

  describe('calculateDateRange (via generateReport)', () => {
    beforeEach(() => {
      mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
      const createdReport = { ...mockGeneratedReport, id: 'report-date-calc' };
      mockGeneratedReportRepository.create.mockReturnValue(createdReport);
      mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
      mockGeneratedReportRepository.findOne.mockResolvedValue(createdReport);
    });

    it('should use explicit start and end dates when both provided', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
        startDate: '2026-01-15',
        endDate: '2026-01-22',
      };

      await service.generateReport(dto);

      expect(mockReportDataService.gatherReportData).toHaveBeenCalledWith(
        new Date('2026-01-15'),
        new Date('2026-01-22'),
        undefined,
      );
    });

    it('should auto-calculate weekly date range when no dates provided', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
      };

      await service.generateReport(dto);

      const [start, end] = mockReportDataService.gatherReportData.mock.calls[0];
      // Compare calendar days (normalize to midnight)
      const startDateOnly = new Date(start);
      startDateOnly.setHours(0, 0, 0, 0);
      const endDateOnly = new Date(end);
      endDateOnly.setHours(0, 0, 0, 0);
      const calendarDayDiff = Math.round(
        (endDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(calendarDayDiff).toBe(7);
    });

    it('should auto-calculate monthly date range when no dates provided', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.MONTHLY,
      };

      await service.generateReport(dto);

      const [start, end] = mockReportDataService.gatherReportData.mock.calls[0];
      // Compare calendar days (normalize to midnight)
      const startDateOnly = new Date(start);
      startDateOnly.setHours(0, 0, 0, 0);
      const endDateOnly = new Date(end);
      endDateOnly.setHours(0, 0, 0, 0);
      const calendarDayDiff = Math.round(
        (endDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24),
      );

      // A month is ~28-31 days
      expect(calendarDayDiff).toBeGreaterThanOrEqual(28);
      expect(calendarDayDiff).toBeLessThanOrEqual(31);
    });

    it('should default to WEEKLY when period is not specified', async () => {
      const dto: GenerateReportDto = {};

      await service.generateReport(dto);

      const [start, end] = mockReportDataService.gatherReportData.mock.calls[0];
      // Compare calendar days (normalize to midnight)
      const startDateOnly = new Date(start);
      startDateOnly.setHours(0, 0, 0, 0);
      const endDateOnly = new Date(end);
      endDateOnly.setHours(0, 0, 0, 0);
      const calendarDayDiff = Math.round(
        (endDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Default is WEEKLY = 7 days
      expect(calendarDayDiff).toBe(7);
    });

    it('should set start to midnight (00:00:00.000) for auto-calculated range', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
      };

      await service.generateReport(dto);

      const [start] = mockReportDataService.gatherReportData.mock.calls[0];
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
    });

    it('should set end to end of day (23:59:59.999) for auto-calculated range', async () => {
      const dto: GenerateReportDto = {
        period: ReportPeriod.WEEKLY,
      };

      await service.generateReport(dto);

      const [, end] = mockReportDataService.gatherReportData.mock.calls[0];
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });
  });

  // =============================================
  // GeneratedReportStatus enum coverage
  // =============================================

  describe('GeneratedReportStatus enum coverage', () => {
    it.each([
      GeneratedReportStatus.PENDING,
      GeneratedReportStatus.GENERATED,
      GeneratedReportStatus.SENT,
      GeneratedReportStatus.FAILED,
    ])('should handle filtering by status %s', async (status) => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockGeneratedReportRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAllGeneratedReports({ status });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('report.status = :status', {
        status,
      });
    });
  });

  // =============================================
  // ReportPeriod enum coverage
  // =============================================

  describe('ReportPeriod enum coverage', () => {
    it.each([ReportPeriod.WEEKLY, ReportPeriod.MONTHLY])(
      'should handle generating report with period %s',
      async (period) => {
        const dto: GenerateReportDto = {
          period,
          startDate: '2026-02-01',
          endDate: '2026-02-28',
        };

        const createdReport = { ...mockGeneratedReport, id: `report-${period}` };

        mockReportDataService.gatherReportData.mockResolvedValue(mockReportData);
        mockGeneratedReportRepository.create.mockReturnValue(createdReport);
        mockGeneratedReportRepository.save.mockResolvedValue(createdReport);
        mockGeneratedReportRepository.findOne.mockResolvedValue(createdReport);

        await service.generateReport(dto);

        expect(mockGeneratedReportRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ period }),
        );
      },
    );
  });
});
