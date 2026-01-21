import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stakeholderService } from '@/services/stakeholderService';
import type { StakeholderInput, StakeholderFilter } from '@/types';

interface UseProjectStakeholdersParams extends StakeholderFilter {
  page?: number;
  pageSize?: number;
}

/**
 * プロジェクトのステークホルダー一覧を取得
 */
export function useProjectStakeholders(
  projectId: string | undefined,
  params?: UseProjectStakeholdersParams
) {
  return useQuery({
    queryKey: ['project-stakeholders', projectId, params],
    queryFn: () => stakeholderService.getByProjectId(projectId!, params),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * プロジェクトのステークホルダーをツリー構造で取得
 */
export function useStakeholderTree(projectId: string | undefined) {
  return useQuery({
    queryKey: ['stakeholder-tree', projectId],
    queryFn: () => stakeholderService.getTreeByProjectId(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 単一のステークホルダーを取得
 */
export function useStakeholder(
  projectId: string | undefined,
  stakeholderId: string | undefined
) {
  return useQuery({
    queryKey: ['stakeholder', projectId, stakeholderId],
    queryFn: () => stakeholderService.getById(projectId!, stakeholderId!),
    enabled: !!projectId && !!stakeholderId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * ステークホルダーを追加
 */
export function useAddStakeholder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StakeholderInput) => stakeholderService.create(data),
    onSuccess: (_, variables) => {
      // 関連するキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: ['project-stakeholders', variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['stakeholder-tree', variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['project', variables.projectId],
      });
    },
  });
}

/**
 * ステークホルダーを更新
 */
export function useUpdateStakeholder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      stakeholderId,
      data,
    }: {
      projectId: string;
      stakeholderId: string;
      data: Partial<StakeholderInput>;
    }) => stakeholderService.update(projectId, stakeholderId, data),
    onSuccess: (_, { projectId, stakeholderId }) => {
      // 関連するキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: ['project-stakeholders', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['stakeholder-tree', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['stakeholder', projectId, stakeholderId],
      });
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
      });
    },
  });
}

/**
 * ステークホルダーを削除
 */
export function useDeleteStakeholder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      stakeholderId,
    }: {
      projectId: string;
      stakeholderId: string;
    }) => stakeholderService.delete(projectId, stakeholderId),
    onSuccess: (_, { projectId }) => {
      // 関連するキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: ['project-stakeholders', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['stakeholder-tree', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
      });
    },
  });
}
