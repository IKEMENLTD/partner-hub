import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { taskService } from './taskService';
import { api } from './api';

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

describe('taskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all tasks without params', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [
            { id: '1', title: 'Task 1', status: 'in_progress' },
            { id: '2', title: 'Task 2', status: 'completed' },
          ],
          pagination: { total: 2, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await taskService.getAll();

      expect(api.get).toHaveBeenCalledWith('/tasks');
      expect(result.data).toHaveLength(2);
    });

    it('should fetch tasks with page and pageSize params', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [{ id: '1', title: 'Task 1' }],
          pagination: { total: 50, limit: 10, offset: 10, hasMore: true },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await taskService.getAll({ page: 2, pageSize: 10 });

      expect(api.get).toHaveBeenCalledWith('/tasks?page=2&pageSize=10');
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });

    it('should handle sortField and sortOrder params', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await taskService.getAll({ sortField: 'dueDate', sortOrder: 'desc' });

      expect(api.get).toHaveBeenCalledWith('/tasks?sortField=dueDate&sortOrder=desc');
    });

    it('should handle status array filter', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await taskService.getAll({ status: ['in_progress', 'pending'] as any });

      expect(api.get).toHaveBeenCalledWith('/tasks?status=in_progress&status=pending');
    });

    it('should handle priority array filter', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await taskService.getAll({ priority: ['high', 'critical'] as any });

      expect(api.get).toHaveBeenCalledWith('/tasks?priority=high&priority=critical');
    });

    it('should handle search query', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await taskService.getAll({ search: 'test task' });

      expect(api.get).toHaveBeenCalledWith('/tasks?search=test+task');
    });

    it('should handle assigneeId filter', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await taskService.getAll({ assigneeId: 'user-123' });

      expect(api.get).toHaveBeenCalledWith('/tasks?assigneeId=user-123');
    });

    it('should handle projectId filter', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await taskService.getAll({ projectId: 'proj-456' });

      expect(api.get).toHaveBeenCalledWith('/tasks?projectId=proj-456');
    });

    it('should handle date range filters', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await taskService.getAll({ dueDateFrom: '2024-01-01', dueDateTo: '2024-12-31' });

      expect(api.get).toHaveBeenCalledWith('/tasks?dueDateFrom=2024-01-01&dueDateTo=2024-12-31');
    });

    it('should skip undefined and null values', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await taskService.getAll({
        page: 1,
        search: undefined,
        assigneeId: undefined,
      });

      expect(api.get).toHaveBeenCalledWith('/tasks?page=1');
    });

    it('should handle empty params', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await taskService.getAll({});

      expect(api.get).toHaveBeenCalledWith('/tasks');
    });

    it('should handle API error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(taskService.getAll()).rejects.toThrow('Network error');
    });
  });

  describe('getByProject', () => {
    it('should fetch tasks for a specific project', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [
            { id: '1', title: 'Task 1', projectId: 'proj-1' },
            { id: '2', title: 'Task 2', projectId: 'proj-1' },
          ],
          pagination: { total: 2, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await taskService.getByProject('proj-1');

      expect(api.get).toHaveBeenCalledWith('/projects/proj-1/tasks');
      expect(result.data).toHaveLength(2);
    });

    it('should fetch project tasks with params', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [{ id: '1', title: 'Task 1' }],
          pagination: { total: 20, limit: 10, offset: 10, hasMore: true },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await taskService.getByProject('proj-1', { page: 2, pageSize: 10 });

      expect(api.get).toHaveBeenCalledWith('/projects/proj-1/tasks?page=2&pageSize=10');
      expect(result.page).toBe(2);
    });

    it('should handle status filter for project tasks', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await taskService.getByProject('proj-1', { status: ['completed'] as any });

      expect(api.get).toHaveBeenCalledWith('/projects/proj-1/tasks?status=completed');
    });

    it('should handle empty project tasks', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await taskService.getByProject('proj-1');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle API error for project tasks', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Project not found'));

      await expect(taskService.getByProject('nonexistent')).rejects.toThrow('Project not found');
    });
  });

  describe('createForProject', () => {
    it('should create a task for a specific project', async () => {
      const taskData = {
        title: 'New Task',
        status: 'pending' as const,
        priority: 'high' as const,
        projectId: 'proj-1',
        tags: ['frontend'],
      };
      const createdTask = { id: 'task-1', ...taskData };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: createdTask,
      });

      const result = await taskService.createForProject('proj-1', taskData);

      expect(api.post).toHaveBeenCalledWith('/projects/proj-1/tasks', taskData);
      expect(result).toEqual(createdTask);
    });

    it('should handle validation error on create for project', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Validation error'));

      await expect(
        taskService.createForProject('proj-1', {
          title: '',
          status: 'pending' as any,
          priority: 'low' as any,
          projectId: 'proj-1',
          tags: [],
        })
      ).rejects.toThrow('Validation error');
    });
  });

  describe('getById', () => {
    it('should fetch task by id', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 'high',
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockTask,
      });

      const result = await taskService.getById('task-1');

      expect(api.get).toHaveBeenCalledWith('/tasks/task-1');
      expect(result).toEqual(mockTask);
    });

    it('should handle 404 error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Task not found'));

      await expect(taskService.getById('nonexistent')).rejects.toThrow('Task not found');
    });

    it('should handle various id formats', async () => {
      const mockTask = { id: 'uuid-123-456-789', title: 'Task' };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockTask,
      });

      await taskService.getById('uuid-123-456-789');

      expect(api.get).toHaveBeenCalledWith('/tasks/uuid-123-456-789');
    });
  });

  describe('create', () => {
    it('should create task with full data', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        status: 'pending' as const,
        priority: 'high' as const,
        projectId: 'proj-1',
        assigneeId: 'user-1',
        partnerId: 'partner-1',
        dueDate: '2024-12-31',
        estimatedHours: 8,
        tags: ['frontend', 'urgent'],
      };
      const createdTask = { id: 'task-1', ...taskData };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: createdTask,
      });

      const result = await taskService.create(taskData);

      expect(api.post).toHaveBeenCalledWith('/tasks', taskData);
      expect(result).toEqual(createdTask);
    });

    it('should create task with minimal data', async () => {
      const taskData = {
        title: 'Simple Task',
        status: 'pending' as const,
        priority: 'low' as const,
        projectId: 'proj-1',
        tags: [],
      };
      const createdTask = { id: 'task-2', ...taskData };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: createdTask,
      });

      const result = await taskService.create(taskData);

      expect(api.post).toHaveBeenCalledWith('/tasks', taskData);
      expect(result).toEqual(createdTask);
    });

    it('should handle validation error', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Validation error'));

      await expect(
        taskService.create({
          title: '',
          status: 'pending' as any,
          priority: 'low' as any,
          projectId: '',
          tags: [],
        })
      ).rejects.toThrow('Validation error');
    });
  });

  describe('bulkCreate', () => {
    it('should bulk create tasks', async () => {
      const bulkData = {
        projectId: 'proj-1',
        tasks: [
          { title: 'Task A' },
          { title: 'Task B' },
          { title: 'Task C' },
        ],
      };
      const createdTasks = [
        { id: '1', title: 'Task A', projectId: 'proj-1' },
        { id: '2', title: 'Task B', projectId: 'proj-1' },
        { id: '3', title: 'Task C', projectId: 'proj-1' },
      ];

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: createdTasks,
      });

      const result = await taskService.bulkCreate(bulkData);

      expect(api.post).toHaveBeenCalledWith('/tasks/bulk', bulkData);
      expect(result).toEqual(createdTasks);
      expect(result).toHaveLength(3);
    });

    it('should handle empty tasks array in bulk create', async () => {
      const bulkData = {
        projectId: 'proj-1',
        tasks: [],
      };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const result = await taskService.bulkCreate(bulkData);

      expect(api.post).toHaveBeenCalledWith('/tasks/bulk', bulkData);
      expect(result).toEqual([]);
    });

    it('should handle bulk create error', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Bulk creation failed'));

      await expect(
        taskService.bulkCreate({ projectId: 'proj-1', tasks: [{ title: 'Task' }] })
      ).rejects.toThrow('Bulk creation failed');
    });
  });

  describe('update', () => {
    it('should update task with partial data', async () => {
      const updateData = { title: 'Updated Title' };
      const updatedTask = { id: 'task-1', title: 'Updated Title', status: 'in_progress' };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: updatedTask,
      });

      const result = await taskService.update('task-1', updateData);

      expect(api.patch).toHaveBeenCalledWith('/tasks/task-1', updateData);
      expect(result).toEqual(updatedTask);
    });

    it('should update task status', async () => {
      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'task-1', status: 'completed' },
      });

      await taskService.update('task-1', { status: 'completed' as any });

      expect(api.patch).toHaveBeenCalledWith('/tasks/task-1', { status: 'completed' });
    });

    it('should update task priority', async () => {
      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'task-1', priority: 'critical' },
      });

      await taskService.update('task-1', { priority: 'critical' as any });

      expect(api.patch).toHaveBeenCalledWith('/tasks/task-1', { priority: 'critical' });
    });

    it('should update task assignee', async () => {
      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'task-1', assigneeId: 'user-2' },
      });

      await taskService.update('task-1', { assigneeId: 'user-2' });

      expect(api.patch).toHaveBeenCalledWith('/tasks/task-1', { assigneeId: 'user-2' });
    });

    it('should handle update error', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce(new Error('Task not found'));

      await expect(
        taskService.update('nonexistent', { title: 'Update' })
      ).rejects.toThrow('Task not found');
    });
  });

  describe('delete', () => {
    it('should delete task', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce(undefined);

      await taskService.delete('task-1');

      expect(api.delete).toHaveBeenCalledWith('/tasks/task-1');
    });

    it('should handle delete error', async () => {
      vi.mocked(api.delete).mockRejectedValueOnce(
        new Error('Cannot delete task with active subtasks')
      );

      await expect(taskService.delete('task-1')).rejects.toThrow(
        'Cannot delete task with active subtasks'
      );
    });
  });

  describe('getMyTasks', () => {
    it('should fetch current user tasks', async () => {
      const mockTasks = [
        { id: '1', title: 'My Task 1', assigneeId: 'current-user' },
        { id: '2', title: 'My Task 2', assigneeId: 'current-user' },
      ];

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockTasks,
      });

      const result = await taskService.getMyTasks();

      expect(api.get).toHaveBeenCalledWith('/tasks/my');
      expect(result).toEqual(mockTasks);
      expect(result).toHaveLength(2);
    });

    it('should handle empty my tasks list', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const result = await taskService.getMyTasks();

      expect(result).toEqual([]);
    });

    it('should handle error when fetching my tasks', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(taskService.getMyTasks()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getTodayTasks', () => {
    it('should fetch today tasks', async () => {
      const mockTasks = [
        { id: '1', title: 'Today Task 1', dueDate: '2024-06-15' },
        { id: '2', title: 'Today Task 2', dueDate: '2024-06-15' },
      ];

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockTasks,
      });

      const result = await taskService.getTodayTasks();

      expect(api.get).toHaveBeenCalledWith('/tasks/today');
      expect(result).toEqual(mockTasks);
      expect(result).toHaveLength(2);
    });

    it('should handle no tasks for today', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const result = await taskService.getTodayTasks();

      expect(result).toEqual([]);
    });

    it('should handle error when fetching today tasks', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Server error'));

      await expect(taskService.getTodayTasks()).rejects.toThrow('Server error');
    });
  });

  describe('addComment', () => {
    it('should add comment to task', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await taskService.addComment('task-1', 'This is a comment');

      expect(api.post).toHaveBeenCalledWith('/tasks/task-1/comments', { content: 'This is a comment' });
    });

    it('should handle empty comment content', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Comment content is required'));

      await expect(
        taskService.addComment('task-1', '')
      ).rejects.toThrow('Comment content is required');
    });

    it('should handle comment on nonexistent task', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Task not found'));

      await expect(
        taskService.addComment('nonexistent', 'Comment')
      ).rejects.toThrow('Task not found');
    });
  });

  describe('addSubtask', () => {
    it('should add subtask to task', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await taskService.addSubtask('task-1', 'Subtask Title');

      expect(api.post).toHaveBeenCalledWith('/tasks/task-1/subtasks', { title: 'Subtask Title' });
    });

    it('should handle subtask creation error', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Subtask title is required'));

      await expect(
        taskService.addSubtask('task-1', '')
      ).rejects.toThrow('Subtask title is required');
    });
  });

  describe('toggleSubtask', () => {
    it('should toggle subtask completion', async () => {
      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await taskService.toggleSubtask('task-1', 'subtask-1');

      expect(api.patch).toHaveBeenCalledWith('/tasks/task-1/subtasks/subtask-1/toggle');
    });

    it('should handle toggle error for nonexistent subtask', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce(new Error('Subtask not found'));

      await expect(
        taskService.toggleSubtask('task-1', 'nonexistent')
      ).rejects.toThrow('Subtask not found');
    });
  });

  describe('updateProgress', () => {
    it('should update task progress', async () => {
      const updatedTask = { id: 'task-1', title: 'Task', progress: 75 };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: updatedTask,
      });

      const result = await taskService.updateProgress('task-1', 75);

      expect(api.patch).toHaveBeenCalledWith('/tasks/task-1/progress', { progress: 75 });
      expect(result).toEqual(updatedTask);
    });

    it('should handle zero progress', async () => {
      const updatedTask = { id: 'task-1', progress: 0 };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: updatedTask,
      });

      const result = await taskService.updateProgress('task-1', 0);

      expect(api.patch).toHaveBeenCalledWith('/tasks/task-1/progress', { progress: 0 });
      expect(result.progress).toBe(0);
    });

    it('should handle 100% progress', async () => {
      const updatedTask = { id: 'task-1', progress: 100 };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: updatedTask,
      });

      const result = await taskService.updateProgress('task-1', 100);

      expect(api.patch).toHaveBeenCalledWith('/tasks/task-1/progress', { progress: 100 });
      expect(result.progress).toBe(100);
    });

    it('should handle progress update error', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce(new Error('Invalid progress value'));

      await expect(
        taskService.updateProgress('task-1', 150)
      ).rejects.toThrow('Invalid progress value');
    });
  });

  describe('getDeleted', () => {
    it('should fetch deleted tasks', async () => {
      const mockDeletedTasks = [
        { id: '1', title: 'Deleted Task 1', deletedAt: '2024-06-01' },
        { id: '2', title: 'Deleted Task 2', deletedAt: '2024-06-02' },
      ];

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockDeletedTasks,
      });

      const result = await taskService.getDeleted();

      expect(api.get).toHaveBeenCalledWith('/tasks/deleted');
      expect(result).toEqual(mockDeletedTasks);
      expect(result).toHaveLength(2);
    });

    it('should handle no deleted tasks', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const result = await taskService.getDeleted();

      expect(result).toEqual([]);
    });

    it('should handle error when fetching deleted tasks', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(taskService.getDeleted()).rejects.toThrow('Unauthorized');
    });
  });

  describe('restore', () => {
    it('should restore deleted task', async () => {
      const restoredTask = { id: 'task-1', title: 'Restored Task', deletedAt: null };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: restoredTask,
      });

      const result = await taskService.restore('task-1');

      expect(api.patch).toHaveBeenCalledWith('/tasks/task-1/restore');
      expect(result).toEqual(restoredTask);
    });

    it('should handle restore of non-deleted task', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce(new Error('Task is not deleted'));

      await expect(taskService.restore('task-1')).rejects.toThrow('Task is not deleted');
    });

    it('should handle restore of nonexistent task', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce(new Error('Task not found'));

      await expect(taskService.restore('nonexistent')).rejects.toThrow('Task not found');
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in search query', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await taskService.getAll({ search: 'test & query' });

      expect(api.get).toHaveBeenCalledWith('/tasks?search=test+%26+query');
    });

    it('should handle unicode in task title', async () => {
      const taskData = {
        title: '日本語タスク',
        status: 'pending' as const,
        priority: 'low' as const,
        projectId: 'proj-1',
        tags: [],
      };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...taskData },
      });

      await taskService.create(taskData);

      expect(api.post).toHaveBeenCalledWith('/tasks', taskData);
    });

    it('should handle empty string values in getAll', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await taskService.getAll({ search: '' });

      expect(api.get).toHaveBeenCalledWith('/tasks?search=');
    });

    it('should handle unicode in comment content', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await taskService.addComment('task-1', 'コメント内容テスト');

      expect(api.post).toHaveBeenCalledWith('/tasks/task-1/comments', { content: 'コメント内容テスト' });
    });

    it('should handle unicode in subtask title', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await taskService.addSubtask('task-1', 'サブタスクタイトル');

      expect(api.post).toHaveBeenCalledWith('/tasks/task-1/subtasks', { title: 'サブタスクタイトル' });
    });
  });

  describe('Boundary values', () => {
    it('should handle page 0', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await taskService.getAll({ page: 0 });

      expect(api.get).toHaveBeenCalledWith('/tasks?page=0');
    });

    it('should handle very long task title', async () => {
      const longTitle = 'A'.repeat(1000);
      const taskData = {
        title: longTitle,
        status: 'pending' as const,
        priority: 'low' as const,
        projectId: 'proj-1',
        tags: [],
      };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...taskData },
      });

      await taskService.create(taskData);

      expect(api.post).toHaveBeenCalledWith('/tasks', taskData);
    });

    it('should handle empty tags array', async () => {
      const taskData = {
        title: 'Task',
        status: 'pending' as const,
        priority: 'low' as const,
        projectId: 'proj-1',
        tags: [],
      };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...taskData },
      });

      await taskService.create(taskData);

      expect(api.post).toHaveBeenCalledWith('/tasks', taskData);
    });

    it('should handle many tags', async () => {
      const manyTags = Array(50).fill(null).map((_, i) => `tag${i}`);
      const taskData = {
        title: 'Task',
        status: 'pending' as const,
        priority: 'low' as const,
        projectId: 'proj-1',
        tags: manyTags,
      };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...taskData },
      });

      await taskService.create(taskData);

      expect(api.post).toHaveBeenCalledWith('/tasks', taskData);
    });

    it('should handle zero estimated hours', async () => {
      const taskData = {
        title: 'Quick Task',
        status: 'pending' as const,
        priority: 'low' as const,
        projectId: 'proj-1',
        tags: [],
        estimatedHours: 0,
      };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...taskData },
      });

      await taskService.create(taskData);

      expect(api.post).toHaveBeenCalledWith('/tasks', taskData);
    });

    it('should handle large number of bulk tasks', async () => {
      const tasks = Array(100).fill(null).map((_, i) => ({ title: `Task ${i}` }));
      const bulkData = { projectId: 'proj-1', tasks };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: tasks.map((t, i) => ({ id: String(i), ...t })),
      });

      const result = await taskService.bulkCreate(bulkData);

      expect(api.post).toHaveBeenCalledWith('/tasks/bulk', bulkData);
      expect(result).toHaveLength(100);
    });
  });
});
