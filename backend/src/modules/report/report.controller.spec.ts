import { Test, TestingModule } from '@nestjs/testing';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportSchedulerService } from './report-scheduler.service';

describe('ReportController', () => {
  let controller: ReportController;

  const mockReportConfig = {
    id: 'config-1',
    name: 'Weekly Report',
    type: 'weekly',
    isActive: true,
  };

  const mockGeneratedReport = {
    id: 'report-1',
    configId: 'config-1',
    content: 'Report content',
    createdAt: new Date(),
  };

  const mockReportService = {
    findAllConfigs: jest.fn(),
    createConfig: jest.fn(),
    findConfigById: jest.fn(),
    updateConfig: jest.fn(),
    deleteConfig: jest.fn(),
    findAllGeneratedReports: jest.fn(),
    findGeneratedReportById: jest.fn(),
    generateReport: jest.fn(),
  };

  const mockSchedulerService = {
    generateAndSendReport: jest.fn(),
    processScheduledReports: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        { provide: ReportService, useValue: mockReportService },
        { provide: ReportSchedulerService, useValue: mockSchedulerService },
      ],
    }).compile();

    controller = module.get<ReportController>(ReportController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==================== Report Configs ====================

  describe('getConfigs', () => {
    it('should return report configurations', async () => {
      const expected = { data: [mockReportConfig], total: 1 };
      mockReportService.findAllConfigs.mockResolvedValue(expected);

      const result = await controller.getConfigs({} as any, 'org-1');

      expect(result).toEqual(expected);
    });
  });

  describe('createConfig', () => {
    it('should create a report configuration', async () => {
      const createDto = { name: 'New Config' };
      const user = { id: 'user-1' } as any;
      mockReportService.createConfig.mockResolvedValue(mockReportConfig);

      const result = await controller.createConfig(createDto as any, user, 'org-1');

      expect(result).toEqual(mockReportConfig);
      expect(mockReportService.createConfig).toHaveBeenCalledWith(createDto, 'user-1', 'org-1');
    });
  });

  describe('getConfig', () => {
    it('should return a report config by id', async () => {
      mockReportService.findConfigById.mockResolvedValue(mockReportConfig);

      const result = await controller.getConfig('config-1', 'org-1');

      expect(result).toEqual(mockReportConfig);
    });

    it('should propagate not found errors', async () => {
      mockReportService.findConfigById.mockRejectedValue(new Error('Not found'));

      await expect(controller.getConfig('invalid', 'org-1')).rejects.toThrow('Not found');
    });
  });

  describe('updateConfig', () => {
    it('should update a report config', async () => {
      const updateDto = { name: 'Updated Config' };
      mockReportService.updateConfig.mockResolvedValue({ ...mockReportConfig, ...updateDto });

      const result = await controller.updateConfig('config-1', updateDto as any, 'org-1');

      expect(result.name).toBe('Updated Config');
    });
  });

  describe('deleteConfig', () => {
    it('should delete a report config', async () => {
      mockReportService.deleteConfig.mockResolvedValue(undefined);

      await controller.deleteConfig('config-1', 'org-1');

      expect(mockReportService.deleteConfig).toHaveBeenCalledWith('config-1', 'org-1');
    });
  });

  // ==================== Generated Reports ====================

  describe('getGeneratedReports', () => {
    it('should return generated reports', async () => {
      const expected = { data: [mockGeneratedReport], total: 1 };
      mockReportService.findAllGeneratedReports.mockResolvedValue(expected);

      const result = await controller.getGeneratedReports({} as any, 'org-1');

      expect(result).toEqual(expected);
    });
  });

  describe('getGeneratedReport', () => {
    it('should return a generated report by id', async () => {
      mockReportService.findGeneratedReportById.mockResolvedValue(mockGeneratedReport);

      const result = await controller.getGeneratedReport('report-1', 'org-1');

      expect(result).toEqual(mockGeneratedReport);
    });
  });

  describe('generateReport', () => {
    it('should generate report from config when reportConfigId is provided', async () => {
      const dto = { reportConfigId: 'config-1' };
      const user = { id: 'user-1' } as any;
      mockReportService.findConfigById.mockResolvedValue(mockReportConfig);
      mockSchedulerService.generateAndSendReport.mockResolvedValue(mockGeneratedReport);

      const result = await controller.generateReport(dto as any, user, 'org-1');

      expect(result).toEqual(mockGeneratedReport);
      expect(mockSchedulerService.generateAndSendReport).toHaveBeenCalledWith(mockReportConfig);
    });

    it('should generate manual report when no config id', async () => {
      const dto = { type: 'weekly' };
      const user = { id: 'user-1' } as any;
      mockReportService.generateReport.mockResolvedValue(mockGeneratedReport);

      const result = await controller.generateReport(dto as any, user, 'org-1');

      expect(result).toEqual(mockGeneratedReport);
      expect(mockReportService.generateReport).toHaveBeenCalledWith(dto, 'user-1', 'org-1');
    });
  });

  describe('triggerScheduledReports', () => {
    it('should trigger scheduled reports processing', async () => {
      mockSchedulerService.processScheduledReports.mockResolvedValue(undefined);

      const result = await controller.triggerScheduledReports();

      expect(result).toEqual({ message: 'スケジュールレポートの処理を開始しました' });
    });
  });
});
