import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock projectService
vi.mock('@/services', () => ({
  projectService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getTimeline: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
  },
}));

import {
  useProjects,
  useProject,
  useProjectTimeline,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useAddProjectMember,
  useRemoveProjectMember,
} from './useProjects';
import { projectService } from '@/services';

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

describe('useProjects hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useProjects', () => {
    it('should fetch projects list successfully', async () => {
      const mockProjects = {
        data: [
          { id: '1', name: 'Project 1', status: 'in_progress' },
          { id: '2', name: 'Project 2', status: 'completed' },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(projectService.getAll).mockResolvedValueOnce(mockProjects);

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockProjects);
      expect(projectService.getAll).toHaveBeenCalledWith(undefined);
    });

    it('should fetch projects with filter params', async () => {
      const mockProjects = {
        data: [{ id: '1', name: 'Active Project', status: 'in_progress' }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(projectService.getAll).mockResolvedValueOnce(mockProjects);

      const params = {
        status: ['in_progress'] as const,
        page: 1,
        pageSize: 10,
      };

      const { result } = renderHook(() => useProjects(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(projectService.getAll).toHaveBeenCalledWith(params);
    });

    it('should fetch projects with pagination', async () => {
      const mockProjects = {
        data: [{ id: '10', name: 'Project 10' }],
        total: 100,
        page: 2,
        pageSize: 10,
        totalPages: 10,
      };

      vi.mocked(projectService.getAll).mockResolvedValueOnce(mockProjects);

      const params = { page: 2, pageSize: 10 };
      const { result } = renderHook(() => useProjects(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.page).toBe(2);
      expect(result.current.data?.totalPages).toBe(10);
    });

    it('should fetch projects with sorting', async () => {
      const mockProjects = {
        data: [{ id: '1', name: 'A Project' }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(projectService.getAll).mockResolvedValueOnce(mockProjects);

      const params = { sortField: 'name', sortOrder: 'asc' as const };
      const { result } = renderHook(() => useProjects(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(projectService.getAll).toHaveBeenCalledWith(params);
    });

    it('should handle error when fetching projects', async () => {
      vi.mocked(projectService.getAll).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should handle empty projects list', async () => {
      const mockProjects = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      };

      vi.mocked(projectService.getAll).mockResolvedValueOnce(mockProjects);

      const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(0);
      expect(result.current.data?.total).toBe(0);
    });
  });

  describe('useProject', () => {
    it('should fetch single project by id', async () => {
      const mockProject = {
        id: '1',
        name: 'Test Project',
        description: 'Description',
        status: 'in_progress',
      };

      vi.mocked(projectService.getById).mockResolvedValueOnce(mockProject);

      const { result } = renderHook(() => useProject('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockProject);
      expect(projectService.getById).toHaveBeenCalledWith('1');
    });

    it('should not fetch when id is undefined', async () => {
      const { result } = renderHook(() => useProject(undefined), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(projectService.getById).not.toHaveBeenCalled();
    });

    it('should handle 404 error', async () => {
      vi.mocked(projectService.getById).mockRejectedValueOnce(
        new Error('Project not found')
      );

      const { result } = renderHook(() => useProject('nonexistent'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useProjectTimeline', () => {
    it('should fetch project timeline', async () => {
      const mockTimeline = [
        { id: '1', type: 'project_created', title: 'Project created' },
        { id: '2', type: 'task_completed', title: 'Task completed' },
      ];

      vi.mocked(projectService.getTimeline).mockResolvedValueOnce(mockTimeline);

      const { result } = renderHook(() => useProjectTimeline('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockTimeline);
      expect(projectService.getTimeline).toHaveBeenCalledWith('1');
    });

    it('should not fetch when id is undefined', async () => {
      const { result } = renderHook(() => useProjectTimeline(undefined), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(projectService.getTimeline).not.toHaveBeenCalled();
    });

    it('should handle empty timeline', async () => {
      vi.mocked(projectService.getTimeline).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useProjectTimeline('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useCreateProject', () => {
    it('should create project successfully', async () => {
      const newProject = {
        id: 'new-1',
        name: 'New Project',
        description: 'New Description',
        status: 'draft',
      };

      vi.mocked(projectService.create).mockResolvedValueOnce(newProject);

      const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'New Project',
          description: 'New Description',
        });
      });

      expect(projectService.create).toHaveBeenCalledWith({
        name: 'New Project',
        description: 'New Description',
      });
    });

    it('should handle validation error', async () => {
      vi.mocked(projectService.create).mockRejectedValueOnce(
        new Error('Validation error: name is required')
      );

      const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({ name: '' });
        })
      ).rejects.toThrow();
    });

    it('should create project with all fields', async () => {
      const fullProject = {
        id: 'new-1',
        name: 'Full Project',
        description: 'Description',
        status: 'planning',
        priority: 'high',
        budget: 100000,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      vi.mocked(projectService.create).mockResolvedValueOnce(fullProject);

      const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Full Project',
          description: 'Description',
          status: 'planning',
          priority: 'high',
          budget: 100000,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });
      });

      expect(projectService.create).toHaveBeenCalled();
    });
  });

  describe('useUpdateProject', () => {
    it('should update project successfully', async () => {
      const updatedProject = {
        id: '1',
        name: 'Updated Project',
        status: 'in_progress',
      };

      vi.mocked(projectService.update).mockResolvedValueOnce(updatedProject);

      const { result } = renderHook(() => useUpdateProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          id: '1',
          data: { name: 'Updated Project' },
        });
      });

      expect(projectService.update).toHaveBeenCalledWith('1', { name: 'Updated Project' });
    });

    it('should handle partial update', async () => {
      vi.mocked(projectService.update).mockResolvedValueOnce({ id: '1', status: 'completed' });

      const { result } = renderHook(() => useUpdateProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          id: '1',
          data: { status: 'completed' },
        });
      });

      expect(projectService.update).toHaveBeenCalledWith('1', { status: 'completed' });
    });

    it('should handle update error', async () => {
      vi.mocked(projectService.update).mockRejectedValueOnce(
        new Error('Project not found')
      );

      const { result } = renderHook(() => useUpdateProject(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            id: 'nonexistent',
            data: { name: 'Update' },
          });
        })
      ).rejects.toThrow();
    });
  });

  describe('useDeleteProject', () => {
    it('should delete project successfully', async () => {
      vi.mocked(projectService.delete).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('1');
      });

      expect(projectService.delete).toHaveBeenCalledWith('1');
    });

    it('should handle delete error', async () => {
      vi.mocked(projectService.delete).mockRejectedValueOnce(
        new Error('Cannot delete project with active tasks')
      );

      const { result } = renderHook(() => useDeleteProject(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync('1');
        })
      ).rejects.toThrow();
    });
  });

  describe('useAddProjectMember', () => {
    it('should add member successfully', async () => {
      vi.mocked(projectService.addMember).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAddProjectMember(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          projectId: '1',
          userId: 'user-1',
          role: 'member',
        });
      });

      expect(projectService.addMember).toHaveBeenCalledWith('1', 'user-1', 'member');
    });

    it('should add member with different roles', async () => {
      const roles = ['owner', 'manager', 'member', 'viewer'];

      for (const role of roles) {
        vi.mocked(projectService.addMember).mockResolvedValueOnce(undefined);

        const { result } = renderHook(() => useAddProjectMember(), { wrapper: createWrapper() });

        await act(async () => {
          await result.current.mutateAsync({
            projectId: '1',
            userId: 'user-1',
            role,
          });
        });

        expect(projectService.addMember).toHaveBeenCalledWith('1', 'user-1', role);
      }
    });

    it('should handle duplicate member error', async () => {
      vi.mocked(projectService.addMember).mockRejectedValueOnce(
        new Error('User is already a member')
      );

      const { result } = renderHook(() => useAddProjectMember(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            projectId: '1',
            userId: 'user-1',
            role: 'member',
          });
        })
      ).rejects.toThrow();
    });
  });

  describe('useRemoveProjectMember', () => {
    it('should remove member successfully', async () => {
      vi.mocked(projectService.removeMember).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useRemoveProjectMember(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          projectId: '1',
          memberId: 'member-1',
        });
      });

      expect(projectService.removeMember).toHaveBeenCalledWith('1', 'member-1');
    });

    it('should handle remove error', async () => {
      vi.mocked(projectService.removeMember).mockRejectedValueOnce(
        new Error('Cannot remove the last owner')
      );

      const { result } = renderHook(() => useRemoveProjectMember(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            projectId: '1',
            memberId: 'owner-1',
          });
        })
      ).rejects.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in project name', async () => {
      const projectWithSpecialChars = {
        id: '1',
        name: 'Project <script>alert("xss")</script>',
        status: 'draft',
      };

      vi.mocked(projectService.create).mockResolvedValueOnce(projectWithSpecialChars);

      const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Project <script>alert("xss")</script>',
        });
      });

      expect(projectService.create).toHaveBeenCalled();
    });

    it('should handle unicode in project name', async () => {
      const projectWithUnicode = {
        id: '1',
        name: '日本語プロジェクト',
        status: 'draft',
      };

      vi.mocked(projectService.create).mockResolvedValueOnce(projectWithUnicode);

      const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: '日本語プロジェクト',
        });
      });

      expect(projectService.create).toHaveBeenCalledWith({
        name: '日本語プロジェクト',
      });
    });

    it('should handle very long project name', async () => {
      const longName = 'A'.repeat(500);
      const projectWithLongName = {
        id: '1',
        name: longName,
        status: 'draft',
      };

      vi.mocked(projectService.create).mockResolvedValueOnce(projectWithLongName);

      const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ name: longName });
      });

      expect(projectService.create).toHaveBeenCalledWith({ name: longName });
    });
  });

  describe('Boundary values', () => {
    it('should handle zero budget', async () => {
      const projectWithZeroBudget = {
        id: '1',
        name: 'Zero Budget Project',
        budget: 0,
      };

      vi.mocked(projectService.create).mockResolvedValueOnce(projectWithZeroBudget);

      const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Zero Budget Project',
          budget: 0,
        });
      });

      expect(projectService.create).toHaveBeenCalledWith({
        name: 'Zero Budget Project',
        budget: 0,
      });
    });

    it('should handle large budget', async () => {
      const largeBudget = 999999999999;
      const projectWithLargeBudget = {
        id: '1',
        name: 'Large Budget Project',
        budget: largeBudget,
      };

      vi.mocked(projectService.create).mockResolvedValueOnce(projectWithLargeBudget);

      const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Large Budget Project',
          budget: largeBudget,
        });
      });

      expect(projectService.create).toHaveBeenCalledWith({
        name: 'Large Budget Project',
        budget: largeBudget,
      });
    });

    it('should handle page 0', async () => {
      const mockProjects = {
        data: [],
        total: 0,
        page: 0,
        pageSize: 10,
        totalPages: 0,
      };

      vi.mocked(projectService.getAll).mockResolvedValueOnce(mockProjects);

      const { result } = renderHook(() => useProjects({ page: 0 }), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(projectService.getAll).toHaveBeenCalledWith({ page: 0 });
    });

    it('should handle negative pageSize (should be caught by API)', async () => {
      vi.mocked(projectService.getAll).mockRejectedValueOnce(
        new Error('Invalid pageSize')
      );

      const { result } = renderHook(() => useProjects({ pageSize: -1 }), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
