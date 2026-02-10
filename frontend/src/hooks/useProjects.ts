import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/services';
import type { ProjectInput, ProjectFilter } from '@/types';

interface UseProjectsParams extends ProjectFilter {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useProjects(params?: UseProjectsParams) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectService.getAll(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProjectTimeline(id: string | undefined) {
  return useQuery({
    queryKey: ['project-timeline', id],
    queryFn: () => projectService.getTimeline(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProjectInput) => projectService.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-stakeholders', result.id] });
      queryClient.invalidateQueries({ queryKey: ['stakeholder-tree', result.id] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectInput> }) =>
      projectService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['project-stakeholders', id] });
      queryClient.invalidateQueries({ queryKey: ['stakeholder-tree', id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      userId,
      role,
    }: {
      projectId: string;
      userId: string;
      role: string;
    }) => projectService.addMember(projectId, userId, role),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      memberId,
    }: {
      projectId: string;
      memberId: string;
    }) => projectService.removeMember(projectId, memberId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}
