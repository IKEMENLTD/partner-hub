import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dashboardService } from './dashboardService';
import { api } from './api';

// Mock useAuthStore
vi.mock('@/store', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      session: { access_token: 'mock-token-123' },
    })),
  },
}));

// Mock api module
vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  transformPaginatedResponse: vi.fn((response) => {
    const { pagination } = response.data;
    const page = Math.floor(pagination.offset / pagination.limit) + 1;
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    return {
      data: response.data.data,
      total: pagination.total,
      page,
      pageSize: pagination.limit,
      totalPages,
    };
  }),
  extractData: vi.fn((response) => response.data),
}));

// Mock fetch for generateReport / downloadReport
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getStats', () => {
    it('should fetch dashboard stats', async () => {
      const mockStats = {
        totalProjects: 10,
        activeProjects: 5,
        completedProjects: 3,
        totalTasks: 50,
        completedTasks: 20,
        pendingTasks: 15,
        overdueTasks: 5,
        totalPartners: 8,
        activePartners: 6,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockStats,
      });

      const result = await dashboardService.getStats();

      expect(api.get).toHaveBeenCalledWith('/dashboard/stats');
      expect(result).toEqual(mockStats);
    });

    it('should handle stats with zero values', async () => {
      const emptyStats = {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        totalPartners: 0,
        activePartners: 0,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: emptyStats,
      });

      const result = await dashboardService.getStats();

      expect(result).toEqual(emptyStats);
    });

    it('should handle API error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(dashboardService.getStats()).rejects.toThrow('Network error');
    });
  });

  describe('getTodayStats', () => {
    it('should fetch today stats', async () => {
      const mockTodayStats = {
        tasksForToday: [
          { id: '1', title: 'Task 1', dueDate: '2024-06-15' },
        ],
        upcomingDeadlines: [
          { id: '2', title: 'Task 2', dueDate: '2024-06-18' },
        ],
        upcomingProjectDeadlines: [],
        recentAlerts: [],
        recentActivity: [],
        totalProjects: 5,
        totalPartners: 3,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockTodayStats,
      });

      const result = await dashboardService.getTodayStats();

      expect(api.get).toHaveBeenCalledWith('/dashboard/today');
      expect(result).toEqual(mockTodayStats);
    });

    it('should handle empty today stats', async () => {
      const emptyTodayStats = {
        tasksForToday: [],
        upcomingDeadlines: [],
        upcomingProjectDeadlines: [],
        recentAlerts: [],
        recentActivity: [],
        totalProjects: 0,
        totalPartners: 0,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: emptyTodayStats,
      });

      const result = await dashboardService.getTodayStats();

      expect(result.tasksForToday).toEqual([]);
      expect(result.upcomingDeadlines).toEqual([]);
    });

    it('should handle API error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Server error'));

      await expect(dashboardService.getTodayStats()).rejects.toThrow('Server error');
    });
  });

  describe('getMyToday', () => {
    it('should fetch my today data', async () => {
      const mockMyToday = {
        tasks: [{ id: '1', title: 'My Task' }],
        meetings: [],
        notifications: 3,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockMyToday,
      });

      const result = await dashboardService.getMyToday();

      expect(api.get).toHaveBeenCalledWith('/dashboard/my-today');
      expect(result).toEqual(mockMyToday);
    });

    it('should handle empty my today data', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: {},
      });

      const result = await dashboardService.getMyToday();

      expect(result).toEqual({});
    });

    it('should handle API error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(dashboardService.getMyToday()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getManagerDashboard', () => {
    it('should fetch manager dashboard without period', async () => {
      const mockManagerData = {
        period: 'weekly',
        periodStart: '2024-06-10',
        periodEnd: '2024-06-16',
        projectSummary: {
          total: 10,
          active: 5,
          completed: 3,
          delayed: 1,
          onTrack: 4,
          atRisk: 1,
        },
        taskSummary: {
          total: 50,
          completed: 20,
          inProgress: 15,
          pending: 10,
          overdue: 5,
          completionRate: 40,
        },
        partnerPerformance: [],
        projectsAtRisk: [],
        recentActivities: [],
        budgetOverview: {
          totalBudget: 1000000,
          totalSpent: 500000,
          utilizationRate: 50,
          projectBudgets: [],
        },
        upcomingDeadlines: [],
        teamWorkload: [],
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockManagerData,
      });

      const result = await dashboardService.getManagerDashboard();

      expect(api.get).toHaveBeenCalledWith('/dashboard/manager');
      expect(result).toEqual(mockManagerData);
    });

    it('should fetch manager dashboard with weekly period', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: { period: 'weekly' },
      });

      await dashboardService.getManagerDashboard('weekly');

      expect(api.get).toHaveBeenCalledWith('/dashboard/manager?period=weekly');
    });

    it('should fetch manager dashboard with monthly period', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: { period: 'monthly' },
      });

      await dashboardService.getManagerDashboard('monthly');

      expect(api.get).toHaveBeenCalledWith('/dashboard/manager?period=monthly');
    });

    it('should handle manager dashboard with partner performance data', async () => {
      const mockData = {
        period: 'weekly',
        periodStart: '2024-06-10',
        periodEnd: '2024-06-16',
        partnerPerformance: [
          {
            partnerId: 'p1',
            partnerName: 'Partner A',
            activeProjects: 3,
            tasksCompleted: 10,
            tasksTotal: 15,
            onTimeDeliveryRate: 85,
            rating: 4.2,
          },
        ],
        projectsAtRisk: [
          {
            id: 'proj-1',
            name: 'At Risk Project',
            status: 'in_progress',
            progress: 30,
            daysRemaining: 5,
            overdueTaskCount: 3,
            riskLevel: 'high',
            riskReasons: ['Too many overdue tasks'],
          },
        ],
        teamWorkload: [
          {
            userId: 'u1',
            userName: 'User A',
            totalTasks: 20,
            completedTasks: 10,
            inProgressTasks: 5,
            overdueTasks: 2,
          },
        ],
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockData,
      });

      const result = await dashboardService.getManagerDashboard('weekly');

      expect(result.partnerPerformance).toHaveLength(1);
      expect(result.projectsAtRisk).toHaveLength(1);
      expect(result.teamWorkload).toHaveLength(1);
    });

    it('should handle API error for manager dashboard', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Forbidden'));

      await expect(dashboardService.getManagerDashboard()).rejects.toThrow('Forbidden');
    });
  });

  describe('getAlerts', () => {
    it('should fetch alerts', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          type: 'task_overdue',
          title: 'Task Overdue',
          message: 'Task X is overdue',
          severity: 'high',
          userId: 'user-1',
          isRead: false,
          createdAt: '2024-06-15T10:00:00Z',
        },
        {
          id: 'alert-2',
          type: 'task_due',
          title: 'Task Due Soon',
          message: 'Task Y is due tomorrow',
          severity: 'medium',
          userId: 'user-1',
          isRead: true,
          createdAt: '2024-06-14T10:00:00Z',
        },
      ];

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockAlerts,
      });

      const result = await dashboardService.getAlerts();

      expect(api.get).toHaveBeenCalledWith('/dashboard/alerts');
      expect(result).toEqual(mockAlerts);
      expect(result).toHaveLength(2);
    });

    it('should handle empty alerts', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const result = await dashboardService.getAlerts();

      expect(result).toEqual([]);
    });

    it('should handle API error when fetching alerts', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(dashboardService.getAlerts()).rejects.toThrow('Network error');
    });
  });

  describe('markAlertAsRead', () => {
    it('should mark single alert as read', async () => {
      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await dashboardService.markAlertAsRead('alert-1');

      expect(api.patch).toHaveBeenCalledWith('/dashboard/alerts/alert-1/read');
    });

    it('should handle marking nonexistent alert', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce(new Error('Alert not found'));

      await expect(
        dashboardService.markAlertAsRead('nonexistent')
      ).rejects.toThrow('Alert not found');
    });

    it('should handle various alert id formats', async () => {
      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await dashboardService.markAlertAsRead('uuid-abc-123-def');

      expect(api.patch).toHaveBeenCalledWith('/dashboard/alerts/uuid-abc-123-def/read');
    });
  });

  describe('markAllAlertsAsRead', () => {
    it('should mark all alerts as read', async () => {
      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await dashboardService.markAllAlertsAsRead();

      expect(api.patch).toHaveBeenCalledWith('/dashboard/alerts/read-all');
    });

    it('should handle error when marking all alerts as read', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce(new Error('Server error'));

      await expect(dashboardService.markAllAlertsAsRead()).rejects.toThrow('Server error');
    });
  });

  describe('generateReport', () => {
    it('should generate a weekly PDF report', async () => {
      const mockBlob = new Blob(['report data'], { type: 'application/pdf' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await dashboardService.generateReport({
        reportType: 'weekly',
        format: 'pdf',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard/reports/generate?reportType=weekly&format=pdf'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token-123',
          }),
        })
      );
      expect(result).toBeInstanceOf(Blob);
    });

    it('should generate a monthly Excel report', async () => {
      const mockBlob = new Blob(['excel data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await dashboardService.generateReport({
        reportType: 'monthly',
        format: 'excel',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('reportType=monthly&format=excel'),
        expect.any(Object)
      );
      expect(result).toBeInstanceOf(Blob);
    });

    it('should generate a custom CSV report with date range', async () => {
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await dashboardService.generateReport({
        reportType: 'custom',
        format: 'csv',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('reportType=custom&format=csv&startDate=2024-01-01&endDate=2024-06-30'),
        expect.any(Object)
      );
      expect(result).toBeInstanceOf(Blob);
    });

    it('should include startDate without endDate', async () => {
      const mockBlob = new Blob(['data']);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      await dashboardService.generateReport({
        reportType: 'custom',
        format: 'pdf',
        startDate: '2024-01-01',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2024-01-01'),
        expect.any(Object)
      );
      // Should not contain endDate
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('endDate');
    });

    it('should handle report generation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Report generation failed' }),
      });

      await expect(
        dashboardService.generateReport({ reportType: 'weekly', format: 'pdf' })
      ).rejects.toThrow('Report generation failed');
    });

    it('should handle report generation failure with no message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(
        dashboardService.generateReport({ reportType: 'weekly', format: 'pdf' })
      ).rejects.toThrow('レポートの生成に失敗しました');
    });

    it('should handle network error during report generation', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        dashboardService.generateReport({ reportType: 'weekly', format: 'pdf' })
      ).rejects.toThrow('Network error');
    });
  });

  describe('downloadReport', () => {
    it('should download a weekly PDF report', async () => {
      const mockBlob = new Blob(['report data'], { type: 'application/pdf' });
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockClick = vi.fn();

      vi.stubGlobal('URL', {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      });

      // Use defineProperty instead of direct assignment since createElement is read-only
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            click: mockClick,
          } as unknown as HTMLElement;
        }
        return originalCreateElement(tag);
      });

      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await dashboardService.downloadReport({
        reportType: 'weekly',
        format: 'pdf',
      });

      expect(result).toContain('週次');
      expect(result).toContain('.pdf');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should generate correct filename for monthly report', async () => {
      const mockBlob = new Blob(['data']);
      const mockClick = vi.fn();

      vi.stubGlobal('URL', {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
        revokeObjectURL: vi.fn(),
      });

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            click: mockClick,
          } as unknown as HTMLElement;
        }
        return originalCreateElement(tag);
      });

      vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn());
      vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await dashboardService.downloadReport({
        reportType: 'monthly',
        format: 'csv',
      });

      expect(result).toContain('月次');
      expect(result).toContain('.csv');
    });

    it('should generate correct filename for custom Excel report', async () => {
      const mockBlob = new Blob(['data']);
      const mockClick = vi.fn();

      vi.stubGlobal('URL', {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
        revokeObjectURL: vi.fn(),
      });

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            click: mockClick,
          } as unknown as HTMLElement;
        }
        return originalCreateElement(tag);
      });

      vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn());
      vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await dashboardService.downloadReport({
        reportType: 'custom',
        format: 'excel',
      });

      expect(result).toContain('カスタム');
      expect(result).toContain('.xlsx');
    });

    it('should propagate error from generateReport', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Generation failed' }),
      });

      await expect(
        dashboardService.downloadReport({ reportType: 'weekly', format: 'pdf' })
      ).rejects.toThrow('Generation failed');
    });
  });

  describe('Edge cases', () => {
    it('should handle stats with very large numbers', async () => {
      const largeStats = {
        totalProjects: 999999,
        activeProjects: 500000,
        completedProjects: 400000,
        totalTasks: 9999999,
        completedTasks: 5000000,
        pendingTasks: 3000000,
        overdueTasks: 1000000,
        totalPartners: 100000,
        activePartners: 80000,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: largeStats,
      });

      const result = await dashboardService.getStats();

      expect(result.totalProjects).toBe(999999);
      expect(result.totalTasks).toBe(9999999);
    });

    it('should handle alerts with project and task references', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          type: 'task_overdue',
          title: 'Alert with refs',
          message: 'Message',
          severity: 'high',
          projectId: 'proj-1',
          taskId: 'task-1',
          userId: 'user-1',
          isRead: false,
          createdAt: '2024-06-15T10:00:00Z',
        },
      ];

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockAlerts,
      });

      const result = await dashboardService.getAlerts();

      expect(result[0].projectId).toBe('proj-1');
      expect(result[0].taskId).toBe('task-1');
    });

    it('should handle alerts without optional project/task references', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          type: 'system_notification',
          title: 'System Alert',
          message: 'System message',
          severity: 'low',
          userId: 'user-1',
          isRead: false,
          createdAt: '2024-06-15T10:00:00Z',
        },
      ];

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockAlerts,
      });

      const result = await dashboardService.getAlerts();

      expect(result[0].projectId).toBeUndefined();
      expect(result[0].taskId).toBeUndefined();
    });

    it('should handle manager dashboard with empty arrays', async () => {
      const emptyManagerData = {
        period: 'weekly',
        periodStart: '2024-06-10',
        periodEnd: '2024-06-16',
        projectSummary: {
          total: 0,
          active: 0,
          completed: 0,
          delayed: 0,
          onTrack: 0,
          atRisk: 0,
        },
        taskSummary: {
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          overdue: 0,
          completionRate: 0,
        },
        partnerPerformance: [],
        projectsAtRisk: [],
        recentActivities: [],
        budgetOverview: {
          totalBudget: 0,
          totalSpent: 0,
          utilizationRate: 0,
          projectBudgets: [],
        },
        upcomingDeadlines: [],
        teamWorkload: [],
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: emptyManagerData,
      });

      const result = await dashboardService.getManagerDashboard();

      expect(result.partnerPerformance).toEqual([]);
      expect(result.projectsAtRisk).toEqual([]);
      expect(result.upcomingDeadlines).toEqual([]);
      expect(result.teamWorkload).toEqual([]);
    });
  });

  describe('Boundary values', () => {
    it('should handle 100% completion rate in task summary', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: {
          period: 'weekly',
          taskSummary: { completionRate: 100 },
        },
      });

      const result = await dashboardService.getManagerDashboard();

      expect(result.taskSummary.completionRate).toBe(100);
    });

    it('should handle 0% completion rate in task summary', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: {
          period: 'weekly',
          taskSummary: { completionRate: 0 },
        },
      });

      const result = await dashboardService.getManagerDashboard();

      expect(result.taskSummary.completionRate).toBe(0);
    });

    it('should handle budget with zero utilization', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: {
          period: 'weekly',
          budgetOverview: {
            totalBudget: 1000000,
            totalSpent: 0,
            utilizationRate: 0,
            projectBudgets: [],
          },
        },
      });

      const result = await dashboardService.getManagerDashboard();

      expect(result.budgetOverview.utilizationRate).toBe(0);
    });

    it('should handle budget with 100% utilization', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: {
          period: 'weekly',
          budgetOverview: {
            totalBudget: 1000000,
            totalSpent: 1000000,
            utilizationRate: 100,
            projectBudgets: [],
          },
        },
      });

      const result = await dashboardService.getManagerDashboard();

      expect(result.budgetOverview.utilizationRate).toBe(100);
    });

    it('should handle project at risk with critical level', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: {
          period: 'weekly',
          projectsAtRisk: [
            {
              id: 'proj-1',
              name: 'Critical Project',
              status: 'in_progress',
              progress: 10,
              daysRemaining: 1,
              overdueTaskCount: 15,
              riskLevel: 'critical',
              riskReasons: ['Severe delay', 'Over budget', 'Resource shortage'],
            },
          ],
        },
      });

      const result = await dashboardService.getManagerDashboard();

      expect(result.projectsAtRisk[0].riskLevel).toBe('critical');
      expect(result.projectsAtRisk[0].riskReasons).toHaveLength(3);
    });

    it('should handle upcoming deadline with negative days remaining', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: {
          period: 'weekly',
          upcomingDeadlines: [
            {
              id: 'task-1',
              title: 'Overdue Task',
              projectId: 'proj-1',
              dueDate: '2024-06-10',
              status: 'in_progress',
              priority: 'high',
              daysRemaining: -5,
            },
          ],
        },
      });

      const result = await dashboardService.getManagerDashboard();

      expect(result.upcomingDeadlines[0].daysRemaining).toBe(-5);
    });

    it('should handle partner with perfect on-time delivery rate', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: {
          period: 'weekly',
          partnerPerformance: [
            {
              partnerId: 'p1',
              partnerName: 'Perfect Partner',
              activeProjects: 5,
              tasksCompleted: 100,
              tasksTotal: 100,
              onTimeDeliveryRate: 100,
              rating: 5,
            },
          ],
        },
      });

      const result = await dashboardService.getManagerDashboard();

      expect(result.partnerPerformance[0].onTimeDeliveryRate).toBe(100);
      expect(result.partnerPerformance[0].rating).toBe(5);
    });
  });
});
