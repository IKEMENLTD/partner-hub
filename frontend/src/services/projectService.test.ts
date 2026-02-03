import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { projectService } from './projectService';
import { api } from './api';

// Mock api module
vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  transformPaginatedResponse: vi.fn((response) => ({
    data: response.data.data,
    total: response.data.meta.total,
    page: response.data.meta.page,
    pageSize: response.data.meta.limit,
    totalPages: response.data.meta.totalPages,
  })),
  extractData: vi.fn((response) => response.data),
}));

describe('projectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all projects without params', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [
            { id: '1', name: 'Project 1', status: 'in_progress' },
            { id: '2', name: 'Project 2', status: 'completed' },
          ],
          meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await projectService.getAll();

      expect(api.get).toHaveBeenCalledWith('/projects');
      expect(result.data).toHaveLength(2);
    });

    it('should fetch projects with page and pageSize params', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [{ id: '1', name: 'Project 1' }],
          meta: { total: 50, page: 2, limit: 10, totalPages: 5 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await projectService.getAll({ page: 2, pageSize: 10 });

      expect(api.get).toHaveBeenCalledWith('/projects?page=2&limit=10');
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });

    it('should convert sortField to sortBy', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await projectService.getAll({ sortField: 'name' });

      expect(api.get).toHaveBeenCalledWith('/projects?sortBy=name');
    });

    it('should convert sortOrder to uppercase', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await projectService.getAll({ sortOrder: 'asc' });

      expect(api.get).toHaveBeenCalledWith('/projects?sortOrder=ASC');
    });

    it('should handle status array filter', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await projectService.getAll({ status: ['in_progress', 'planning'] });

      expect(api.get).toHaveBeenCalledWith('/projects?status=in_progress&status=planning');
    });

    it('should handle priority array filter', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await projectService.getAll({ priority: ['high', 'urgent'] });

      expect(api.get).toHaveBeenCalledWith('/projects?priority=high&priority=urgent');
    });

    it('should handle search query', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await projectService.getAll({ search: 'test project' });

      expect(api.get).toHaveBeenCalledWith('/projects?search=test+project');
    });

    it('should handle date range filters', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await projectService.getAll({
        startDateFrom: '2024-01-01',
        startDateTo: '2024-12-31',
      });

      expect(api.get).toHaveBeenCalledWith(
        '/projects?startDateFrom=2024-01-01&startDateTo=2024-12-31'
      );
    });

    it('should skip undefined and null values', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await projectService.getAll({
        page: 1,
        search: undefined,
        managerId: undefined,
      });

      expect(api.get).toHaveBeenCalledWith('/projects?page=1');
    });

    it('should handle empty params', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await projectService.getAll({});

      expect(api.get).toHaveBeenCalledWith('/projects');
    });

    it('should handle API error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(projectService.getAll()).rejects.toThrow('Network error');
    });
  });

  describe('getById', () => {
    it('should fetch project by id', async () => {
      const mockProject = {
        id: '1',
        name: 'Test Project',
        description: 'Description',
        status: 'in_progress',
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockProject,
      });

      const result = await projectService.getById('1');

      expect(api.get).toHaveBeenCalledWith('/projects/1');
      expect(result).toEqual(mockProject);
    });

    it('should handle 404 error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Project not found'));

      await expect(projectService.getById('nonexistent')).rejects.toThrow('Project not found');
    });

    it('should handle various id formats', async () => {
      const mockProject = { id: 'uuid-123-456', name: 'Project' };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockProject,
      });

      await projectService.getById('uuid-123-456');

      expect(api.get).toHaveBeenCalledWith('/projects/uuid-123-456');
    });
  });

  describe('create', () => {
    it('should create project with minimal data', async () => {
      const newProject = { id: 'new-1', name: 'New Project', status: 'draft' };
      const createData = { name: 'New Project' };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: newProject,
      });

      const result = await projectService.create(createData);

      expect(api.post).toHaveBeenCalledWith('/projects', createData);
      expect(result).toEqual(newProject);
    });

    it('should create project with all fields', async () => {
      const fullData = {
        name: 'Full Project',
        description: 'Description',
        status: 'planning' as const,
        priority: 'high' as const,
        projectType: 'development' as const,
        companyRole: 'prime_contractor' as const,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        budget: 1000000,
        ownerId: 'user-1',
        managerId: 'user-2',
        partnerIds: ['partner-1', 'partner-2'],
        tags: ['tag1', 'tag2'],
        metadata: { custom: 'value' },
      };

      const createdProject = { id: 'new-1', ...fullData };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: createdProject,
      });

      const result = await projectService.create(fullData);

      expect(api.post).toHaveBeenCalledWith('/projects', fullData);
      expect(result).toEqual(createdProject);
    });

    it('should handle validation error', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Validation error'));

      await expect(projectService.create({ name: '' })).rejects.toThrow('Validation error');
    });
  });

  describe('update', () => {
    it('should update project with partial data', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedProject = { id: '1', name: 'Updated Name', status: 'in_progress' };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: updatedProject,
      });

      const result = await projectService.update('1', updateData);

      expect(api.patch).toHaveBeenCalledWith('/projects/1', updateData);
      expect(result).toEqual(updatedProject);
    });

    it('should update project status', async () => {
      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: '1', status: 'completed' },
      });

      await projectService.update('1', { status: 'completed' });

      expect(api.patch).toHaveBeenCalledWith('/projects/1', { status: 'completed' });
    });

    it('should handle update error', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce(new Error('Project not found'));

      await expect(
        projectService.update('nonexistent', { name: 'Update' })
      ).rejects.toThrow('Project not found');
    });
  });

  describe('delete', () => {
    it('should delete project', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce(undefined);

      await projectService.delete('1');

      expect(api.delete).toHaveBeenCalledWith('/projects/1');
    });

    it('should handle delete error', async () => {
      vi.mocked(api.delete).mockRejectedValueOnce(
        new Error('Cannot delete project with active tasks')
      );

      await expect(projectService.delete('1')).rejects.toThrow(
        'Cannot delete project with active tasks'
      );
    });
  });

  describe('getTimeline', () => {
    it('should fetch project timeline', async () => {
      const mockTimeline = [
        { id: '1', type: 'project_created', title: 'Project created' },
        { id: '2', type: 'task_completed', title: 'Task completed' },
      ];

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockTimeline,
      });

      const result = await projectService.getTimeline('1');

      expect(api.get).toHaveBeenCalledWith('/projects/1/timeline');
      expect(result).toEqual(mockTimeline);
    });

    it('should handle empty timeline', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const result = await projectService.getTimeline('1');

      expect(result).toEqual([]);
    });

    it('should handle timeline error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Project not found'));

      await expect(projectService.getTimeline('nonexistent')).rejects.toThrow('Project not found');
    });
  });

  describe('addMember', () => {
    it('should add member to project', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await projectService.addMember('project-1', 'user-1', 'member');

      expect(api.post).toHaveBeenCalledWith('/projects/project-1/members', {
        userId: 'user-1',
        role: 'member',
      });
    });

    it('should add member with different roles', async () => {
      const roles = ['owner', 'manager', 'member', 'viewer'];

      for (const role of roles) {
        vi.mocked(api.post).mockResolvedValueOnce({ success: true, data: null });

        await projectService.addMember('project-1', 'user-1', role);

        expect(api.post).toHaveBeenLastCalledWith('/projects/project-1/members', {
          userId: 'user-1',
          role,
        });
      }
    });

    it('should handle duplicate member error', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(
        new Error('User is already a member of this project')
      );

      await expect(
        projectService.addMember('project-1', 'user-1', 'member')
      ).rejects.toThrow('User is already a member of this project');
    });
  });

  describe('removeMember', () => {
    it('should remove member from project', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await projectService.removeMember('project-1', 'member-1');

      expect(api.delete).toHaveBeenCalledWith('/projects/project-1/members/member-1');
    });

    it('should handle remove last owner error', async () => {
      vi.mocked(api.delete).mockRejectedValueOnce(
        new Error('Cannot remove the last owner from the project')
      );

      await expect(
        projectService.removeMember('project-1', 'owner-1')
      ).rejects.toThrow('Cannot remove the last owner from the project');
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in search query', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await projectService.getAll({ search: 'test & query' });

      expect(api.get).toHaveBeenCalledWith('/projects?search=test+%26+query');
    });

    it('should handle unicode in project name', async () => {
      const createData = { name: '日本語プロジェクト' };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...createData },
      });

      await projectService.create(createData);

      expect(api.post).toHaveBeenCalledWith('/projects', createData);
    });

    it('should handle empty string values', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await projectService.getAll({ search: '' });

      // Empty string should be included
      expect(api.get).toHaveBeenCalledWith('/projects?search=');
    });
  });

  describe('Boundary values', () => {
    it('should handle zero budget', async () => {
      const createData = { name: 'Zero Budget Project', budget: 0 };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...createData },
      });

      await projectService.create(createData);

      expect(api.post).toHaveBeenCalledWith('/projects', createData);
    });

    it('should handle very large budget', async () => {
      const largeBudget = 999999999999;
      const createData = { name: 'Large Budget Project', budget: largeBudget };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...createData },
      });

      await projectService.create(createData);

      expect(api.post).toHaveBeenCalledWith('/projects', createData);
    });

    it('should handle page 0', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          meta: { total: 0, page: 0, limit: 10, totalPages: 0 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await projectService.getAll({ page: 0 });

      expect(api.get).toHaveBeenCalledWith('/projects?page=0');
    });

    it('should handle very long project name', async () => {
      const longName = 'A'.repeat(1000);
      const createData = { name: longName };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...createData },
      });

      await projectService.create(createData);

      expect(api.post).toHaveBeenCalledWith('/projects', createData);
    });

    it('should handle empty tags array', async () => {
      const createData = { name: 'Project', tags: [] };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...createData },
      });

      await projectService.create(createData);

      expect(api.post).toHaveBeenCalledWith('/projects', createData);
    });

    it('should handle empty partnerIds array', async () => {
      const createData = { name: 'Project', partnerIds: [] };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...createData },
      });

      await projectService.create(createData);

      expect(api.post).toHaveBeenCalledWith('/projects', createData);
    });
  });
});
