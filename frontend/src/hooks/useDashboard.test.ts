import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dashboardService
vi.mock('@/services', () => ({
  dashboardService: {
    getStats: vi.fn(),
    getTodayStats: vi.fn(),
    getAlerts: vi.fn(),
    markAlertAsRead: vi.fn(),
    markAllAlertsAsRead: vi.fn(),
    getManagerDashboard: vi.fn(),
  },
}));

import {
  useDashboardStats,
  useTodayStats,
  useAlerts,
  useMarkAlertAsRead,
  useMarkAllAlertsAsRead,
  useManagerDashboard,
} from './useDashboard';
import { dashboardService } from '@/services';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockDashboardStats = {
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

const mockTodayStats = {
  tasksForToday: [
    {
      id: 'task-1',
      title: 'Today Task',
      status: 'todo',
      priority: 'high',
      projectId: 'project-1',
      tags: [],
      subtasks: [],
      comments: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ],
  upcomingDeadlines: [],
  upcomingProjectDeadlines: [],
  recentAlerts: [],
  recentActivity: [],
  totalProjects: 10,
  totalPartners: 8,
};

const mockAlerts = [
  {
    id: 'alert-1',
    type: 'task_overdue' as const,
    title: 'Task Overdue',
    message: 'Task "Important Task" is overdue',
    severity: 'warning' as const,
    projectId: 'project-1',
    taskId: 'task-1',
    userId: 'user-1',
    isRead: false,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'alert-2',
    type: 'project_deadline' as const,
    title: 'Project Deadline',
    message: 'Project "Main Project" deadline approaching',
    severity: 'info' as const,
    projectId: 'project-2',
    userId: 'user-1',
    isRead: true,
    createdAt: '2024-01-14T09:00:00Z',
  },
];

const mockManagerDashboard = {
  period: 'month',
  periodStart: '2024-01-01',
  periodEnd: '2024-01-31',
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
  partnerPerformance: [
    {
      partnerId: 'partner-1',
      partnerName: 'Partner A',
      activeProjects: 3,
      tasksCompleted: 12,
      tasksTotal: 15,
      onTimeDeliveryRate: 80,
      rating: 4.2,
    },
  ],
  projectsAtRisk: [
    {
      id: 'project-3',
      name: 'At Risk Project',
      status: 'in_progress',
      progress: 20,
      daysRemaining: 5,
      overdueTaskCount: 3,
      riskLevel: 'high' as const,
      riskReasons: ['Too many overdue tasks', 'Behind schedule'],
    },
  ],
  recentActivities: [],
  budgetOverview: {
    totalBudget: 1000000,
    totalSpent: 500000,
    utilizationRate: 50,
    projectBudgets: [],
  },
  upcomingDeadlines: [],
  teamWorkload: [
    {
      userId: 'user-1',
      userName: 'Team Member 1',
      totalTasks: 10,
      completedTasks: 5,
      inProgressTasks: 3,
      overdueTasks: 2,
    },
  ],
};

describe('useDashboard hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // useDashboardStats
  // ============================================================
  describe('useDashboardStats', () => {
    it('should fetch dashboard stats successfully', async () => {
      vi.mocked(dashboardService.getStats).mockResolvedValueOnce(mockDashboardStats);

      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockDashboardStats);
      expect(dashboardService.getStats).toHaveBeenCalled();
    });

    it('should handle error when fetching stats', async () => {
      vi.mocked(dashboardService.getStats).mockRejectedValueOnce(
        new Error('Server error')
      );

      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should handle stats with all zero values', async () => {
      const zeroStats = {
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

      vi.mocked(dashboardService.getStats).mockResolvedValueOnce(zeroStats);

      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.totalProjects).toBe(0);
      expect(result.current.data?.totalTasks).toBe(0);
      expect(result.current.data?.totalPartners).toBe(0);
    });

    it('should handle stats with large values', async () => {
      const largeStats = {
        ...mockDashboardStats,
        totalProjects: 99999,
        totalTasks: 999999,
        totalPartners: 50000,
      };

      vi.mocked(dashboardService.getStats).mockResolvedValueOnce(largeStats);

      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.totalProjects).toBe(99999);
      expect(result.current.data?.totalTasks).toBe(999999);
    });
  });

  // ============================================================
  // useTodayStats
  // ============================================================
  describe('useTodayStats', () => {
    it('should fetch today stats successfully', async () => {
      vi.mocked(dashboardService.getTodayStats).mockResolvedValueOnce(mockTodayStats);

      const { result } = renderHook(() => useTodayStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockTodayStats);
      expect(dashboardService.getTodayStats).toHaveBeenCalled();
    });

    it('should handle error when fetching today stats', async () => {
      vi.mocked(dashboardService.getTodayStats).mockRejectedValueOnce(
        new Error('Unauthorized')
      );

      const { result } = renderHook(() => useTodayStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should handle today stats with empty arrays', async () => {
      const emptyTodayStats = {
        tasksForToday: [],
        upcomingDeadlines: [],
        upcomingProjectDeadlines: [],
        recentAlerts: [],
        recentActivity: [],
        totalProjects: 0,
        totalPartners: 0,
      };

      vi.mocked(dashboardService.getTodayStats).mockResolvedValueOnce(emptyTodayStats);

      const { result } = renderHook(() => useTodayStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.tasksForToday).toHaveLength(0);
      expect(result.current.data?.upcomingDeadlines).toHaveLength(0);
      expect(result.current.data?.recentAlerts).toHaveLength(0);
    });

    it('should handle today stats with multiple tasks', async () => {
      const busyTodayStats = {
        ...mockTodayStats,
        tasksForToday: [
          ...mockTodayStats.tasksForToday,
          {
            id: 'task-2',
            title: 'Second Task',
            status: 'in_progress',
            priority: 'medium',
            projectId: 'project-1',
            tags: [],
            subtasks: [],
            comments: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
      };

      vi.mocked(dashboardService.getTodayStats).mockResolvedValueOnce(busyTodayStats);

      const { result } = renderHook(() => useTodayStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.tasksForToday).toHaveLength(2);
    });
  });

  // ============================================================
  // useAlerts
  // ============================================================
  describe('useAlerts', () => {
    it('should fetch alerts successfully', async () => {
      vi.mocked(dashboardService.getAlerts).mockResolvedValueOnce(mockAlerts);

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockAlerts);
      expect(result.current.data).toHaveLength(2);
      expect(dashboardService.getAlerts).toHaveBeenCalled();
    });

    it('should handle error when fetching alerts', async () => {
      vi.mocked(dashboardService.getAlerts).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should handle empty alerts', async () => {
      vi.mocked(dashboardService.getAlerts).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('should handle alerts with different severities', async () => {
      const mixedAlerts = [
        { ...mockAlerts[0], severity: 'info' as const },
        { ...mockAlerts[0], id: 'alert-3', severity: 'warning' as const },
        { ...mockAlerts[0], id: 'alert-4', severity: 'error' as const },
        { ...mockAlerts[0], id: 'alert-5', severity: 'success' as const },
      ];

      vi.mocked(dashboardService.getAlerts).mockResolvedValueOnce(mixedAlerts);

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(4);
    });

    it('should handle alerts with different types', async () => {
      const typedAlerts = [
        { ...mockAlerts[0], type: 'task_due' as const },
        { ...mockAlerts[0], id: 'alert-6', type: 'task_overdue' as const },
        { ...mockAlerts[0], id: 'alert-7', type: 'project_deadline' as const },
        { ...mockAlerts[0], id: 'alert-8', type: 'project_stagnant' as const },
      ];

      vi.mocked(dashboardService.getAlerts).mockResolvedValueOnce(typedAlerts);

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(4);
    });
  });

  // ============================================================
  // useMarkAlertAsRead
  // ============================================================
  describe('useMarkAlertAsRead', () => {
    it('should mark alert as read successfully', async () => {
      vi.mocked(dashboardService.markAlertAsRead).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useMarkAlertAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('alert-1');
      });

      expect(dashboardService.markAlertAsRead).toHaveBeenCalledWith('alert-1');
    });

    it('should handle error when marking alert as read', async () => {
      vi.mocked(dashboardService.markAlertAsRead).mockRejectedValueOnce(
        new Error('Alert not found')
      );

      const { result } = renderHook(() => useMarkAlertAsRead(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync('nonexistent');
        })
      ).rejects.toThrow();
    });

    it('should handle marking already-read alert', async () => {
      vi.mocked(dashboardService.markAlertAsRead).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useMarkAlertAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('alert-2');
      });

      expect(dashboardService.markAlertAsRead).toHaveBeenCalledWith('alert-2');
    });
  });

  // ============================================================
  // useMarkAllAlertsAsRead
  // ============================================================
  describe('useMarkAllAlertsAsRead', () => {
    it('should mark all alerts as read successfully', async () => {
      vi.mocked(dashboardService.markAllAlertsAsRead).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useMarkAllAlertsAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(dashboardService.markAllAlertsAsRead).toHaveBeenCalled();
    });

    it('should handle error when marking all alerts as read', async () => {
      vi.mocked(dashboardService.markAllAlertsAsRead).mockRejectedValueOnce(
        new Error('Server error')
      );

      const { result } = renderHook(() => useMarkAllAlertsAsRead(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync();
        })
      ).rejects.toThrow();
    });

    it('should handle marking all when no alerts exist', async () => {
      vi.mocked(dashboardService.markAllAlertsAsRead).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useMarkAllAlertsAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(dashboardService.markAllAlertsAsRead).toHaveBeenCalled();
    });
  });

  // ============================================================
  // useManagerDashboard
  // ============================================================
  describe('useManagerDashboard', () => {
    it('should fetch manager dashboard with default period', async () => {
      vi.mocked(dashboardService.getManagerDashboard).mockResolvedValueOnce(
        mockManagerDashboard
      );

      const { result } = renderHook(() => useManagerDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockManagerDashboard);
      expect(dashboardService.getManagerDashboard).toHaveBeenCalledWith(undefined);
    });

    it('should fetch manager dashboard with weekly period', async () => {
      const weeklyDashboard = {
        ...mockManagerDashboard,
        period: 'week',
        periodStart: '2024-01-08',
        periodEnd: '2024-01-14',
      };

      vi.mocked(dashboardService.getManagerDashboard).mockResolvedValueOnce(weeklyDashboard);

      const { result } = renderHook(() => useManagerDashboard('week'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.period).toBe('week');
      expect(dashboardService.getManagerDashboard).toHaveBeenCalledWith('week');
    });

    it('should fetch manager dashboard with monthly period', async () => {
      vi.mocked(dashboardService.getManagerDashboard).mockResolvedValueOnce(
        mockManagerDashboard
      );

      const { result } = renderHook(() => useManagerDashboard('month'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.period).toBe('month');
      expect(dashboardService.getManagerDashboard).toHaveBeenCalledWith('month');
    });

    it('should handle error when fetching manager dashboard', async () => {
      vi.mocked(dashboardService.getManagerDashboard).mockRejectedValueOnce(
        new Error('Forbidden - not a manager')
      );

      const { result } = renderHook(() => useManagerDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should return project summary data', async () => {
      vi.mocked(dashboardService.getManagerDashboard).mockResolvedValueOnce(
        mockManagerDashboard
      );

      const { result } = renderHook(() => useManagerDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const summary = result.current.data?.projectSummary;
      expect(summary?.total).toBe(10);
      expect(summary?.active).toBe(5);
      expect(summary?.completed).toBe(3);
      expect(summary?.delayed).toBe(1);
      expect(summary?.onTrack).toBe(4);
      expect(summary?.atRisk).toBe(1);
    });

    it('should return task summary data', async () => {
      vi.mocked(dashboardService.getManagerDashboard).mockResolvedValueOnce(
        mockManagerDashboard
      );

      const { result } = renderHook(() => useManagerDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const summary = result.current.data?.taskSummary;
      expect(summary?.total).toBe(50);
      expect(summary?.completed).toBe(20);
      expect(summary?.completionRate).toBe(40);
    });

    it('should return partner performance data', async () => {
      vi.mocked(dashboardService.getManagerDashboard).mockResolvedValueOnce(
        mockManagerDashboard
      );

      const { result } = renderHook(() => useManagerDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const partners = result.current.data?.partnerPerformance;
      expect(partners).toHaveLength(1);
      expect(partners?.[0].partnerName).toBe('Partner A');
      expect(partners?.[0].onTimeDeliveryRate).toBe(80);
    });

    it('should return projects at risk data', async () => {
      vi.mocked(dashboardService.getManagerDashboard).mockResolvedValueOnce(
        mockManagerDashboard
      );

      const { result } = renderHook(() => useManagerDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const atRisk = result.current.data?.projectsAtRisk;
      expect(atRisk).toHaveLength(1);
      expect(atRisk?.[0].riskLevel).toBe('high');
      expect(atRisk?.[0].riskReasons).toHaveLength(2);
    });

    it('should return budget overview data', async () => {
      vi.mocked(dashboardService.getManagerDashboard).mockResolvedValueOnce(
        mockManagerDashboard
      );

      const { result } = renderHook(() => useManagerDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const budget = result.current.data?.budgetOverview;
      expect(budget?.totalBudget).toBe(1000000);
      expect(budget?.totalSpent).toBe(500000);
      expect(budget?.utilizationRate).toBe(50);
    });

    it('should return team workload data', async () => {
      vi.mocked(dashboardService.getManagerDashboard).mockResolvedValueOnce(
        mockManagerDashboard
      );

      const { result } = renderHook(() => useManagerDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const workload = result.current.data?.teamWorkload;
      expect(workload).toHaveLength(1);
      expect(workload?.[0].userName).toBe('Team Member 1');
      expect(workload?.[0].totalTasks).toBe(10);
      expect(workload?.[0].overdueTasks).toBe(2);
    });

    it('should handle empty manager dashboard', async () => {
      const emptyDashboard = {
        ...mockManagerDashboard,
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

      vi.mocked(dashboardService.getManagerDashboard).mockResolvedValueOnce(emptyDashboard);

      const { result } = renderHook(() => useManagerDashboard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.projectSummary.total).toBe(0);
      expect(result.current.data?.partnerPerformance).toHaveLength(0);
      expect(result.current.data?.teamWorkload).toHaveLength(0);
    });
  });

  // ============================================================
  // Edge cases
  // ============================================================
  describe('Edge cases', () => {
    it('should handle alert with missing optional fields', async () => {
      const minimalAlert = [
        {
          id: 'alert-minimal',
          type: 'custom' as const,
          title: 'Minimal Alert',
          message: 'Just a message',
          severity: 'info' as const,
          userId: 'user-1',
          isRead: false,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(dashboardService.getAlerts).mockResolvedValueOnce(minimalAlert);

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.[0].projectId).toBeUndefined();
      expect(result.current.data?.[0].taskId).toBeUndefined();
    });

    it('should handle many alerts', async () => {
      const manyAlerts = Array.from({ length: 100 }, (_, i) => ({
        ...mockAlerts[0],
        id: `alert-${i}`,
        title: `Alert ${i}`,
      }));

      vi.mocked(dashboardService.getAlerts).mockResolvedValueOnce(manyAlerts);

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(100);
    });

    it('should handle dashboard stats with overdue tasks exceeding total', async () => {
      const inconsistentStats = {
        ...mockDashboardStats,
        totalTasks: 10,
        overdueTasks: 15, // edge: more overdue than total (data inconsistency)
      };

      vi.mocked(dashboardService.getStats).mockResolvedValueOnce(inconsistentStats);

      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Hook should still return the data as-is without validation
      expect(result.current.data?.overdueTasks).toBe(15);
      expect(result.current.data?.totalTasks).toBe(10);
    });
  });

  // ============================================================
  // Loading states
  // ============================================================
  describe('Loading states', () => {
    it('should show loading state initially for dashboard stats', async () => {
      // Use a promise that never resolves to keep loading
      vi.mocked(dashboardService.getStats).mockReturnValueOnce(new Promise(() => {}));

      const { result } = renderHook(() => useDashboardStats(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should show loading state initially for today stats', async () => {
      vi.mocked(dashboardService.getTodayStats).mockReturnValueOnce(new Promise(() => {}));

      const { result } = renderHook(() => useTodayStats(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should show loading state initially for alerts', async () => {
      vi.mocked(dashboardService.getAlerts).mockReturnValueOnce(new Promise(() => {}));

      const { result } = renderHook(() => useAlerts(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should show loading state initially for manager dashboard', async () => {
      vi.mocked(dashboardService.getManagerDashboard).mockReturnValueOnce(
        new Promise(() => {})
      );

      const { result } = renderHook(() => useManagerDashboard(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });
});
