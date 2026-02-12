import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { HttpStatus } from '@nestjs/common';

describe('DashboardController', () => {
  let controller: DashboardController;

  const mockDashboardService = {
    getOverview: jest.fn(),
    getProjectSummaries: jest.fn(),
    getPartnerPerformance: jest.fn(),
    getUpcomingDeadlines: jest.fn(),
    getOverdueItems: jest.fn(),
    getRecentActivity: jest.fn(),
    getTaskDistribution: jest.fn(),
    getProjectProgress: jest.fn(),
    getUserDashboard: jest.fn(),
    getMyToday: jest.fn(),
    getUserAlerts: jest.fn(),
    markAlertAsRead: jest.fn(),
    markAllAlertsAsRead: jest.fn(),
    getManagerDashboard: jest.fn(),
    generateReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOverview', () => {
    it('should return dashboard overview', async () => {
      const overview = { totalProjects: 10, totalTasks: 50 };
      mockDashboardService.getOverview.mockResolvedValue(overview);

      const result = await controller.getOverview('user-1');

      expect(result).toEqual(overview);
      expect(mockDashboardService.getOverview).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getProjectSummaries', () => {
    it('should return project summaries with default limit', async () => {
      mockDashboardService.getProjectSummaries.mockResolvedValue([]);

      await controller.getProjectSummaries(undefined, 'org-1');

      expect(mockDashboardService.getProjectSummaries).toHaveBeenCalledWith(10, 'org-1');
    });

    it('should return project summaries with custom limit', async () => {
      mockDashboardService.getProjectSummaries.mockResolvedValue([]);

      await controller.getProjectSummaries(5, 'org-1');

      expect(mockDashboardService.getProjectSummaries).toHaveBeenCalledWith(5, 'org-1');
    });
  });

  describe('getPartnerPerformance', () => {
    it('should return partner performance with default limit', async () => {
      mockDashboardService.getPartnerPerformance.mockResolvedValue([]);

      await controller.getPartnerPerformance(undefined, 'org-1');

      expect(mockDashboardService.getPartnerPerformance).toHaveBeenCalledWith(10, 'org-1');
    });
  });

  describe('getUpcomingDeadlines', () => {
    it('should return upcoming deadlines with default days', async () => {
      mockDashboardService.getUpcomingDeadlines.mockResolvedValue([]);

      await controller.getUpcomingDeadlines(undefined, 'org-1');

      expect(mockDashboardService.getUpcomingDeadlines).toHaveBeenCalledWith(7, 'org-1');
    });

    it('should return upcoming deadlines with custom days', async () => {
      mockDashboardService.getUpcomingDeadlines.mockResolvedValue([]);

      await controller.getUpcomingDeadlines(14, 'org-1');

      expect(mockDashboardService.getUpcomingDeadlines).toHaveBeenCalledWith(14, 'org-1');
    });
  });

  describe('getOverdueItems', () => {
    it('should return overdue items', async () => {
      const items = { projects: [], tasks: [] };
      mockDashboardService.getOverdueItems.mockResolvedValue(items);

      const result = await controller.getOverdueItems('org-1');

      expect(result).toEqual(items);
      expect(mockDashboardService.getOverdueItems).toHaveBeenCalledWith('org-1');
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent activity with default limit', async () => {
      mockDashboardService.getRecentActivity.mockResolvedValue([]);

      await controller.getRecentActivity(undefined, 'org-1');

      expect(mockDashboardService.getRecentActivity).toHaveBeenCalledWith(20, 'org-1');
    });
  });

  describe('getTaskDistribution', () => {
    it('should return task distribution', async () => {
      const distribution = { todo: 5, inProgress: 3, completed: 2 };
      mockDashboardService.getTaskDistribution.mockResolvedValue(distribution);

      const result = await controller.getTaskDistribution('org-1');

      expect(result).toEqual(distribution);
      expect(mockDashboardService.getTaskDistribution).toHaveBeenCalledWith('org-1');
    });
  });

  describe('getProjectProgress', () => {
    it('should return project progress', async () => {
      mockDashboardService.getProjectProgress.mockResolvedValue([]);

      const result = await controller.getProjectProgress('org-1');

      expect(result).toEqual([]);
      expect(mockDashboardService.getProjectProgress).toHaveBeenCalledWith('org-1');
    });
  });

  describe('getUserDashboard', () => {
    it('should return personalized dashboard', async () => {
      const dashboard = { tasks: [], projects: [] };
      mockDashboardService.getUserDashboard.mockResolvedValue(dashboard);

      const result = await controller.getUserDashboard('user-1');

      expect(result).toEqual(dashboard);
      expect(mockDashboardService.getUserDashboard).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getMyToday', () => {
    it('should return today dashboard for user', async () => {
      const today = { tasks: [], alerts: [] };
      mockDashboardService.getMyToday.mockResolvedValue(today);

      const result = await controller.getMyToday('user-1');

      expect(result).toEqual(today);
      expect(mockDashboardService.getMyToday).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getToday', () => {
    it('should return today dashboard (alias)', async () => {
      const today = { tasks: [] };
      mockDashboardService.getMyToday.mockResolvedValue(today);

      const result = await controller.getToday('user-1');

      expect(result).toEqual(today);
      expect(mockDashboardService.getMyToday).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getStats', () => {
    it('should return stats (alias for overview)', async () => {
      const stats = { totalProjects: 10 };
      mockDashboardService.getOverview.mockResolvedValue(stats);

      const result = await controller.getStats('user-1');

      expect(result).toEqual(stats);
      expect(mockDashboardService.getOverview).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getAlerts', () => {
    it('should return user alerts', async () => {
      const alerts = [{ id: 'alert-1', message: 'Test alert' }];
      mockDashboardService.getUserAlerts.mockResolvedValue(alerts);

      const result = await controller.getAlerts('user-1');

      expect(result).toEqual(alerts);
      expect(mockDashboardService.getUserAlerts).toHaveBeenCalledWith('user-1');
    });
  });

  describe('markAlertAsRead', () => {
    it('should mark alert as read', async () => {
      mockDashboardService.markAlertAsRead.mockResolvedValue({ success: true });

      const result = await controller.markAlertAsRead('user-1', 'alert-1');

      expect(mockDashboardService.markAlertAsRead).toHaveBeenCalledWith('user-1', 'alert-1');
    });
  });

  describe('markAllAlertsAsRead', () => {
    it('should mark all alerts as read', async () => {
      mockDashboardService.markAllAlertsAsRead.mockResolvedValue({ success: true });

      const result = await controller.markAllAlertsAsRead('user-1');

      expect(mockDashboardService.markAllAlertsAsRead).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getManagerDashboard', () => {
    it('should return manager dashboard with default period', async () => {
      mockDashboardService.getManagerDashboard.mockResolvedValue({});

      await controller.getManagerDashboard(undefined, 'org-1');

      expect(mockDashboardService.getManagerDashboard).toHaveBeenCalledWith('month', 'org-1');
    });

    it('should return manager dashboard with custom period', async () => {
      mockDashboardService.getManagerDashboard.mockResolvedValue({});

      await controller.getManagerDashboard('week', 'org-1');

      expect(mockDashboardService.getManagerDashboard).toHaveBeenCalledWith('week', 'org-1');
    });
  });

  describe('generateReport', () => {
    it('should generate and return a report file', async () => {
      const reportResult = {
        mimeType: 'text/csv',
        fileName: 'report.csv',
        fileContent: 'col1,col2\nval1,val2',
      };
      mockDashboardService.generateReport.mockResolvedValue(reportResult);

      const mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      };

      await controller.generateReport('weekly' as any, 'csv' as any, undefined, undefined, 'org-1', mockRes as any);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockRes.send).toHaveBeenCalledWith(reportResult.fileContent);
    });

    it('should propagate errors from service', async () => {
      mockDashboardService.generateReport.mockRejectedValue(new Error('Invalid params'));

      const mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await expect(
        controller.generateReport('invalid' as any, 'csv' as any, undefined, undefined, 'org-1', mockRes as any),
      ).rejects.toThrow('Invalid params');
    });
  });
});
