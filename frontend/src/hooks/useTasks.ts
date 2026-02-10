import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { taskService } from '@/services';
import type { Task, TaskInput, TaskFilter } from '@/types';

interface TodayStats {
  tasksForToday: Task[];
  upcomingDeadlines: Task[];
}

interface ProjectTasksData {
  data: Task[];
}

interface UseTasksParams extends TaskFilter {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useTasks(params?: UseTasksParams) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => taskService.getAll(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => taskService.getById(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyTasks() {
  return useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => taskService.getMyTasks(),
    staleTime: 1 * 60 * 1000,
  });
}

export function useTodayTasks() {
  return useQuery({
    queryKey: ['today-tasks'],
    queryFn: () => taskService.getTodayTasks(),
    staleTime: 1 * 60 * 1000,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TaskInput) => taskService.create(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', data.projectId] });
    },
  });
}

export function useBulkCreateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { projectId: string; tasks: { title: string }[] }) =>
      taskService.bulkCreate(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', data.projectId] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskInput> }) =>
      taskService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
    },
  });
}

// Optimistic update for task status changes (faster UX)
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      taskService.update(id, { status } as Partial<TaskInput>),
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['today-stats'] });
      await queryClient.cancelQueries({ queryKey: ['project-tasks'], exact: false });

      // Snapshot previous values
      const previousTodayStats = queryClient.getQueryData(['today-stats']);
      const projectTasksQueries = queryClient.getQueriesData({ queryKey: ['project-tasks'] });

      // Helper to update tasks in an array
      const updateTasks = (tasks: Task[]) =>
        tasks?.map((task: Task) =>
          task.id === id ? { ...task, status } : task
        ) || [];

      // Optimistically update today-stats
      queryClient.setQueryData(['today-stats'], (old: TodayStats | undefined) => {
        if (!old) return old;
        return {
          ...old,
          tasksForToday: updateTasks(old.tasksForToday),
          upcomingDeadlines: updateTasks(old.upcomingDeadlines),
        };
      });

      // Optimistically update all project-tasks queries
      projectTasksQueries.forEach(([queryKey, data]) => {
        const typedData = data as ProjectTasksData | undefined;
        if (typedData?.data) {
          queryClient.setQueryData(queryKey as QueryKey, {
            ...typedData,
            data: updateTasks(typedData.data),
          });
        }
      });

      return { previousTodayStats, projectTasksQueries };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousTodayStats) {
        queryClient.setQueryData(['today-stats'], context.previousTodayStats);
      }
      if (context?.projectTasksQueries) {
        context.projectTasksQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey as QueryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      taskService.addComment(taskId, content),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

export function useAddSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: string; title: string }) =>
      taskService.addSubtask(taskId, title),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

export function useToggleSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) =>
      taskService.toggleSubtask(taskId, subtaskId),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, progress }: { id: string; progress: number }) =>
      taskService.updateProgress(id, progress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-stats'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
    },
  });
}

export function useDeletedTasks() {
  return useQuery({
    queryKey: ['deleted-tasks'],
    queryFn: () => taskService.getDeleted(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useRestoreTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskService.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
    },
  });
}

export function useProjectTasks(projectId: string | undefined, params?: UseTasksParams) {
  return useQuery({
    queryKey: ['project-tasks', projectId, params],
    queryFn: () => taskService.getByProject(projectId!, params),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}
