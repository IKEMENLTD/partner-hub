import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fileService } from '@/services';
import type { FileCategory } from '@/types';

export function useProjectFiles(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-files', projectId],
    queryFn: () => fileService.getFilesByProject(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useTaskFiles(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-files', taskId],
    queryFn: () => fileService.getFilesByTask(taskId!),
    enabled: !!taskId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useFile(fileId: string | undefined) {
  return useQuery({
    queryKey: ['file', fileId],
    queryFn: () => fileService.getFile(fileId!),
    enabled: !!fileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      projectId,
      taskId,
      category,
    }: {
      file: File;
      projectId: string;
      taskId?: string;
      category?: FileCategory;
    }) => fileService.uploadFile(file, projectId, taskId, category),
    onSuccess: (_, { projectId, taskId }) => {
      // Invalidate project files
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      // Invalidate task files if applicable
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['task-files', taskId] });
      }
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fileId,
    }: {
      fileId: string;
      projectId: string;
      taskId?: string;
    }) => fileService.deleteFile(fileId),
    onSuccess: (_, { projectId, taskId }) => {
      // Invalidate project files
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      // Invalidate task files if applicable
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['task-files', taskId] });
      }
    },
  });
}

export function useDownloadUrl(fileId: string | undefined, expiresIn?: number) {
  return useQuery({
    queryKey: ['file-download-url', fileId, expiresIn],
    queryFn: () => fileService.getDownloadUrl(fileId!, expiresIn),
    enabled: !!fileId,
    staleTime: 30 * 1000, // 30 seconds (shorter since URLs expire)
  });
}

export function useGetDownloadUrl() {
  return useMutation({
    mutationFn: ({ fileId, expiresIn }: { fileId: string; expiresIn?: number }) =>
      fileService.getDownloadUrl(fileId, expiresIn),
  });
}
