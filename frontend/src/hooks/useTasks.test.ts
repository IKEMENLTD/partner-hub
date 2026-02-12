import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock taskService
vi.mock('@/services', () => ({
  taskService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getMyTasks: vi.fn(),
    getTodayTasks: vi.fn(),
    create: vi.fn(),
    bulkCreate: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addComment: vi.fn(),
    addSubtask: vi.fn(),
    toggleSubtask: vi.fn(),
    updateProgress: vi.fn(),
    getDeleted: vi.fn(),
    restore: vi.fn(),
    getByProject: vi.fn(),
  },
}));

import {
  useTasks,
  useTask,
  useMyTasks,
  useTodayTasks,
  useCreateTask,
  useBulkCreateTasks,
  useUpdateTask,
  useUpdateTaskStatus,
  useDeleteTask,
  useAddComment,
  useAddSubtask,
  useToggleSubtask,
  useUpdateProgress,
  useDeletedTasks,
  useRestoreTask,
  useProjectTasks,
} from './useTasks';
import { taskService } from '@/services';

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

const mockTask = {
  id: 'task-1',
  title: 'Test Task',
  description: 'Test description',
  status: 'todo' as const,
  priority: 'medium' as const,
  projectId: 'project-1',
  tags: [],
  subtasks: [],
  comments: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockTask2 = {
  id: 'task-2',
  title: 'Another Task',
  description: 'Another description',
  status: 'in_progress' as const,
  priority: 'high' as const,
  projectId: 'project-1',
  tags: ['urgent'],
  subtasks: [],
  comments: [],
  createdAt: '2024-01-02T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

describe('useTasks hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // useTasks - list query
  // ============================================================
  describe('useTasks', () => {
    it('should fetch tasks list successfully', async () => {
      const mockTasks = {
        data: [mockTask, mockTask2],
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(taskService.getAll).mockResolvedValueOnce(mockTasks);

      const { result } = renderHook(() => useTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockTasks);
      expect(taskService.getAll).toHaveBeenCalledWith(undefined);
    });

    it('should fetch tasks with filter params', async () => {
      const mockTasks = {
        data: [mockTask],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(taskService.getAll).mockResolvedValueOnce(mockTasks);

      const params = {
        status: ['todo' as const],
        priority: ['medium' as const],
        page: 1,
        pageSize: 10,
      };

      const { result } = renderHook(() => useTasks(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskService.getAll).toHaveBeenCalledWith(params);
    });

    it('should fetch tasks with pagination', async () => {
      const mockTasks = {
        data: [mockTask2],
        total: 50,
        page: 3,
        pageSize: 10,
        totalPages: 5,
      };

      vi.mocked(taskService.getAll).mockResolvedValueOnce(mockTasks);

      const params = { page: 3, pageSize: 10 };
      const { result } = renderHook(() => useTasks(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.page).toBe(3);
      expect(result.current.data?.totalPages).toBe(5);
    });

    it('should fetch tasks with sorting', async () => {
      const mockTasks = {
        data: [mockTask],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(taskService.getAll).mockResolvedValueOnce(mockTasks);

      const params = { sortField: 'dueDate', sortOrder: 'asc' as const };
      const { result } = renderHook(() => useTasks(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskService.getAll).toHaveBeenCalledWith(params);
    });

    it('should handle error when fetching tasks', async () => {
      vi.mocked(taskService.getAll).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should handle empty tasks list', async () => {
      const mockTasks = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      };

      vi.mocked(taskService.getAll).mockResolvedValueOnce(mockTasks);

      const { result } = renderHook(() => useTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(0);
      expect(result.current.data?.total).toBe(0);
    });
  });

  // ============================================================
  // useTask - single task query
  // ============================================================
  describe('useTask', () => {
    it('should fetch single task by id', async () => {
      vi.mocked(taskService.getById).mockResolvedValueOnce(mockTask);

      const { result } = renderHook(() => useTask('task-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockTask);
      expect(taskService.getById).toHaveBeenCalledWith('task-1');
    });

    it('should not fetch when id is undefined', async () => {
      const { result } = renderHook(() => useTask(undefined), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(taskService.getById).not.toHaveBeenCalled();
    });

    it('should handle 404 error', async () => {
      vi.mocked(taskService.getById).mockRejectedValueOnce(new Error('Task not found'));

      const { result } = renderHook(() => useTask('nonexistent'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  // ============================================================
  // useMyTasks
  // ============================================================
  describe('useMyTasks', () => {
    it('should fetch my tasks successfully', async () => {
      const myTasks = [mockTask, mockTask2];
      vi.mocked(taskService.getMyTasks).mockResolvedValueOnce(myTasks);

      const { result } = renderHook(() => useMyTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(myTasks);
      expect(taskService.getMyTasks).toHaveBeenCalled();
    });

    it('should handle empty my tasks', async () => {
      vi.mocked(taskService.getMyTasks).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useMyTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('should handle error when fetching my tasks', async () => {
      vi.mocked(taskService.getMyTasks).mockRejectedValueOnce(new Error('Unauthorized'));

      const { result } = renderHook(() => useMyTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  // ============================================================
  // useTodayTasks
  // ============================================================
  describe('useTodayTasks', () => {
    it('should fetch today tasks successfully', async () => {
      const todayTasks = [mockTask];
      vi.mocked(taskService.getTodayTasks).mockResolvedValueOnce(todayTasks);

      const { result } = renderHook(() => useTodayTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(todayTasks);
      expect(taskService.getTodayTasks).toHaveBeenCalled();
    });

    it('should handle empty today tasks', async () => {
      vi.mocked(taskService.getTodayTasks).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useTodayTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('should handle error when fetching today tasks', async () => {
      vi.mocked(taskService.getTodayTasks).mockRejectedValueOnce(new Error('Server error'));

      const { result } = renderHook(() => useTodayTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // ============================================================
  // useProjectTasks
  // ============================================================
  describe('useProjectTasks', () => {
    it('should fetch tasks for a project', async () => {
      const projectTasks = {
        data: [mockTask, mockTask2],
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(taskService.getByProject).mockResolvedValueOnce(projectTasks);

      const { result } = renderHook(() => useProjectTasks('project-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(projectTasks);
      expect(taskService.getByProject).toHaveBeenCalledWith('project-1', undefined);
    });

    it('should fetch project tasks with params', async () => {
      const projectTasks = {
        data: [mockTask],
        total: 1,
        page: 1,
        pageSize: 5,
        totalPages: 1,
      };

      vi.mocked(taskService.getByProject).mockResolvedValueOnce(projectTasks);

      const params = { status: ['todo' as const], page: 1, pageSize: 5 };
      const { result } = renderHook(() => useProjectTasks('project-1', params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskService.getByProject).toHaveBeenCalledWith('project-1', params);
    });

    it('should not fetch when projectId is undefined', async () => {
      const { result } = renderHook(() => useProjectTasks(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(taskService.getByProject).not.toHaveBeenCalled();
    });

    it('should handle error when fetching project tasks', async () => {
      vi.mocked(taskService.getByProject).mockRejectedValueOnce(
        new Error('Project not found')
      );

      const { result } = renderHook(() => useProjectTasks('nonexistent'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // ============================================================
  // useDeletedTasks
  // ============================================================
  describe('useDeletedTasks', () => {
    it('should fetch deleted tasks successfully', async () => {
      const deletedTasks = [
        { ...mockTask, id: 'del-1', title: 'Deleted Task' },
      ];

      vi.mocked(taskService.getDeleted).mockResolvedValueOnce(deletedTasks);

      const { result } = renderHook(() => useDeletedTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(deletedTasks);
      expect(taskService.getDeleted).toHaveBeenCalled();
    });

    it('should handle empty deleted tasks', async () => {
      vi.mocked(taskService.getDeleted).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useDeletedTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });

  // ============================================================
  // useCreateTask
  // ============================================================
  describe('useCreateTask', () => {
    it('should create task successfully', async () => {
      vi.mocked(taskService.create).mockResolvedValueOnce(mockTask);

      const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          title: 'Test Task',
          status: 'todo',
          priority: 'medium',
          projectId: 'project-1',
          tags: [],
        });
      });

      expect(taskService.create).toHaveBeenCalledWith({
        title: 'Test Task',
        status: 'todo',
        priority: 'medium',
        projectId: 'project-1',
        tags: [],
      });
    });

    it('should handle validation error', async () => {
      vi.mocked(taskService.create).mockRejectedValueOnce(
        new Error('Validation error: title is required')
      );

      const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            title: '',
            status: 'todo',
            priority: 'medium',
            projectId: 'project-1',
            tags: [],
          });
        })
      ).rejects.toThrow();
    });

    it('should create task with all optional fields', async () => {
      const fullTask = {
        ...mockTask,
        description: 'Full description',
        assigneeId: 'user-1',
        dueDate: '2024-06-30',
        estimatedHours: 8,
      };

      vi.mocked(taskService.create).mockResolvedValueOnce(fullTask);

      const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          title: 'Test Task',
          description: 'Full description',
          status: 'todo',
          priority: 'medium',
          projectId: 'project-1',
          assigneeId: 'user-1',
          dueDate: '2024-06-30',
          estimatedHours: 8,
          tags: [],
        });
      });

      expect(taskService.create).toHaveBeenCalled();
    });
  });

  // ============================================================
  // useBulkCreateTasks
  // ============================================================
  describe('useBulkCreateTasks', () => {
    it('should bulk create tasks successfully', async () => {
      const createdTasks = [mockTask, mockTask2];
      vi.mocked(taskService.bulkCreate).mockResolvedValueOnce(createdTasks);

      const { result } = renderHook(() => useBulkCreateTasks(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          projectId: 'project-1',
          tasks: [{ title: 'Task A' }, { title: 'Task B' }],
        });
      });

      expect(taskService.bulkCreate).toHaveBeenCalledWith({
        projectId: 'project-1',
        tasks: [{ title: 'Task A' }, { title: 'Task B' }],
      });
    });

    it('should handle bulk create error', async () => {
      vi.mocked(taskService.bulkCreate).mockRejectedValueOnce(
        new Error('Project not found')
      );

      const { result } = renderHook(() => useBulkCreateTasks(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            projectId: 'nonexistent',
            tasks: [{ title: 'Task A' }],
          });
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // useUpdateTask
  // ============================================================
  describe('useUpdateTask', () => {
    it('should update task successfully', async () => {
      const updatedTask = { ...mockTask, title: 'Updated Title' };
      vi.mocked(taskService.update).mockResolvedValueOnce(updatedTask);

      const { result } = renderHook(() => useUpdateTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'task-1',
          data: { title: 'Updated Title' },
        });
      });

      expect(taskService.update).toHaveBeenCalledWith('task-1', { title: 'Updated Title' });
    });

    it('should handle partial update (status change)', async () => {
      const updatedTask = { ...mockTask, status: 'completed' as const };
      vi.mocked(taskService.update).mockResolvedValueOnce(updatedTask);

      const { result } = renderHook(() => useUpdateTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'task-1',
          data: { status: 'completed' },
        });
      });

      expect(taskService.update).toHaveBeenCalledWith('task-1', { status: 'completed' });
    });

    it('should handle update error', async () => {
      vi.mocked(taskService.update).mockRejectedValueOnce(new Error('Task not found'));

      const { result } = renderHook(() => useUpdateTask(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            id: 'nonexistent',
            data: { title: 'Update' },
          });
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // useUpdateTaskStatus (optimistic update)
  // ============================================================
  describe('useUpdateTaskStatus', () => {
    it('should update task status successfully', async () => {
      const updatedTask = { ...mockTask, status: 'in_progress' as const };
      vi.mocked(taskService.update).mockResolvedValueOnce(updatedTask);

      const { result } = renderHook(() => useUpdateTaskStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ id: 'task-1', status: 'in_progress' });
      });

      expect(taskService.update).toHaveBeenCalledWith('task-1', { status: 'in_progress' });
    });

    it('should handle status update error', async () => {
      vi.mocked(taskService.update).mockRejectedValueOnce(
        new Error('Cannot change status')
      );

      const { result } = renderHook(() => useUpdateTaskStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'task-1', status: 'completed' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(taskService.update).toHaveBeenCalledWith('task-1', { status: 'completed' });
    });

    it('should handle various status transitions', async () => {
      const statuses = ['todo', 'in_progress', 'review', 'waiting', 'completed', 'cancelled'];

      for (const status of statuses) {
        vi.mocked(taskService.update).mockResolvedValueOnce({ ...mockTask, status } as any);

        const { result } = renderHook(() => useUpdateTaskStatus(), {
          wrapper: createWrapper(),
        });

        await act(async () => {
          await result.current.mutateAsync({ id: 'task-1', status });
        });

        expect(taskService.update).toHaveBeenCalledWith('task-1', { status });
      }
    });
  });

  // ============================================================
  // useDeleteTask
  // ============================================================
  describe('useDeleteTask', () => {
    it('should delete task successfully', async () => {
      vi.mocked(taskService.delete).mockResolvedValueOnce(undefined as any);

      const { result } = renderHook(() => useDeleteTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('task-1');
      });

      expect(taskService.delete).toHaveBeenCalledWith('task-1');
    });

    it('should handle delete error', async () => {
      vi.mocked(taskService.delete).mockRejectedValueOnce(
        new Error('Cannot delete task')
      );

      const { result } = renderHook(() => useDeleteTask(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync('task-1');
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // useRestoreTask
  // ============================================================
  describe('useRestoreTask', () => {
    it('should restore task successfully', async () => {
      vi.mocked(taskService.restore).mockResolvedValueOnce(mockTask);

      const { result } = renderHook(() => useRestoreTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('task-1');
      });

      expect(taskService.restore).toHaveBeenCalledWith('task-1');
    });

    it('should handle restore error', async () => {
      vi.mocked(taskService.restore).mockRejectedValueOnce(
        new Error('Task not found in deleted')
      );

      const { result } = renderHook(() => useRestoreTask(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync('nonexistent');
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // useAddComment
  // ============================================================
  describe('useAddComment', () => {
    it('should add comment successfully', async () => {
      vi.mocked(taskService.addComment).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAddComment(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          taskId: 'task-1',
          content: 'This is a comment',
        });
      });

      expect(taskService.addComment).toHaveBeenCalledWith('task-1', 'This is a comment');
    });

    it('should handle add comment error', async () => {
      vi.mocked(taskService.addComment).mockRejectedValueOnce(
        new Error('Task not found')
      );

      const { result } = renderHook(() => useAddComment(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            taskId: 'nonexistent',
            content: 'Comment',
          });
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // useAddSubtask
  // ============================================================
  describe('useAddSubtask', () => {
    it('should add subtask successfully', async () => {
      vi.mocked(taskService.addSubtask).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAddSubtask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          taskId: 'task-1',
          title: 'New Subtask',
        });
      });

      expect(taskService.addSubtask).toHaveBeenCalledWith('task-1', 'New Subtask');
    });

    it('should handle add subtask error', async () => {
      vi.mocked(taskService.addSubtask).mockRejectedValueOnce(
        new Error('Task not found')
      );

      const { result } = renderHook(() => useAddSubtask(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            taskId: 'nonexistent',
            title: 'Subtask',
          });
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // useToggleSubtask
  // ============================================================
  describe('useToggleSubtask', () => {
    it('should toggle subtask successfully', async () => {
      vi.mocked(taskService.toggleSubtask).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useToggleSubtask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          taskId: 'task-1',
          subtaskId: 'subtask-1',
        });
      });

      expect(taskService.toggleSubtask).toHaveBeenCalledWith('task-1', 'subtask-1');
    });

    it('should handle toggle subtask error', async () => {
      vi.mocked(taskService.toggleSubtask).mockRejectedValueOnce(
        new Error('Subtask not found')
      );

      const { result } = renderHook(() => useToggleSubtask(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            taskId: 'task-1',
            subtaskId: 'nonexistent',
          });
        })
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // useUpdateProgress
  // ============================================================
  describe('useUpdateProgress', () => {
    it('should update progress successfully', async () => {
      const updatedTask = { ...mockTask, progress: 75 };
      vi.mocked(taskService.updateProgress).mockResolvedValueOnce(updatedTask);

      const { result } = renderHook(() => useUpdateProgress(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: 'task-1', progress: 75 });
      });

      expect(taskService.updateProgress).toHaveBeenCalledWith('task-1', 75);
    });

    it('should handle update progress error', async () => {
      vi.mocked(taskService.updateProgress).mockRejectedValueOnce(
        new Error('Invalid progress value')
      );

      const { result } = renderHook(() => useUpdateProgress(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({ id: 'task-1', progress: 150 });
        })
      ).rejects.toThrow();
    });

    it('should handle boundary progress values', async () => {
      // 0%
      vi.mocked(taskService.updateProgress).mockResolvedValueOnce({ ...mockTask, progress: 0 });
      const { result: result0 } = renderHook(() => useUpdateProgress(), {
        wrapper: createWrapper(),
      });
      await act(async () => {
        await result0.current.mutateAsync({ id: 'task-1', progress: 0 });
      });
      expect(taskService.updateProgress).toHaveBeenCalledWith('task-1', 0);

      // 100%
      vi.mocked(taskService.updateProgress).mockResolvedValueOnce({ ...mockTask, progress: 100 });
      const { result: result100 } = renderHook(() => useUpdateProgress(), {
        wrapper: createWrapper(),
      });
      await act(async () => {
        await result100.current.mutateAsync({ id: 'task-1', progress: 100 });
      });
      expect(taskService.updateProgress).toHaveBeenCalledWith('task-1', 100);
    });
  });

  // ============================================================
  // Edge cases
  // ============================================================
  describe('Edge cases', () => {
    it('should handle unicode in task title', async () => {
      const taskWithUnicode = { ...mockTask, title: '日本語タスク名' };
      vi.mocked(taskService.create).mockResolvedValueOnce(taskWithUnicode);

      const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          title: '日本語タスク名',
          status: 'todo',
          priority: 'medium',
          projectId: 'project-1',
          tags: [],
        });
      });

      expect(taskService.create).toHaveBeenCalledWith({
        title: '日本語タスク名',
        status: 'todo',
        priority: 'medium',
        projectId: 'project-1',
        tags: [],
      });
    });

    it('should handle special characters in comment content', async () => {
      vi.mocked(taskService.addComment).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAddComment(), { wrapper: createWrapper() });

      const specialContent = 'Comment with <html> & "quotes" \'single\' `/code/`';
      await act(async () => {
        await result.current.mutateAsync({
          taskId: 'task-1',
          content: specialContent,
        });
      });

      expect(taskService.addComment).toHaveBeenCalledWith('task-1', specialContent);
    });

    it('should handle very long task title', async () => {
      const longTitle = 'A'.repeat(500);
      const taskWithLongTitle = { ...mockTask, title: longTitle };
      vi.mocked(taskService.create).mockResolvedValueOnce(taskWithLongTitle);

      const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          title: longTitle,
          status: 'todo',
          priority: 'medium',
          projectId: 'project-1',
          tags: [],
        });
      });

      expect(taskService.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: longTitle })
      );
    });

    it('should handle task with many tags', async () => {
      const manyTags = Array.from({ length: 50 }, (_, i) => `tag-${i}`);
      const taskWithTags = { ...mockTask, tags: manyTags };
      vi.mocked(taskService.create).mockResolvedValueOnce(taskWithTags);

      const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          title: 'Tagged Task',
          status: 'todo',
          priority: 'medium',
          projectId: 'project-1',
          tags: manyTags,
        });
      });

      expect(taskService.create).toHaveBeenCalledWith(
        expect.objectContaining({ tags: manyTags })
      );
    });
  });

  // ============================================================
  // Boundary values
  // ============================================================
  describe('Boundary values', () => {
    it('should handle zero estimated hours', async () => {
      vi.mocked(taskService.create).mockResolvedValueOnce({
        ...mockTask,
        estimatedHours: 0,
      });

      const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          title: 'Zero Hour Task',
          status: 'todo',
          priority: 'medium',
          projectId: 'project-1',
          estimatedHours: 0,
          tags: [],
        });
      });

      expect(taskService.create).toHaveBeenCalledWith(
        expect.objectContaining({ estimatedHours: 0 })
      );
    });

    it('should handle large page number', async () => {
      const mockTasks = {
        data: [],
        total: 0,
        page: 9999,
        pageSize: 10,
        totalPages: 0,
      };

      vi.mocked(taskService.getAll).mockResolvedValueOnce(mockTasks);

      const { result } = renderHook(() => useTasks({ page: 9999 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskService.getAll).toHaveBeenCalledWith({ page: 9999 });
    });

    it('should handle all priority levels in filter', async () => {
      const mockTasks = {
        data: [mockTask],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(taskService.getAll).mockResolvedValueOnce(mockTasks);

      const params = {
        priority: ['low' as const, 'medium' as const, 'high' as const, 'urgent' as const, 'critical' as const],
      };

      const { result } = renderHook(() => useTasks(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskService.getAll).toHaveBeenCalledWith(params);
    });
  });
});
