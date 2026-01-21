import { api, extractData } from './api';
import type {
  ProjectStakeholder,
  StakeholderInput,
  StakeholderTreeNode,
  StakeholderFilter,
} from '@/types';

interface StakeholderListParams extends StakeholderFilter {
  page?: number;
  pageSize?: number;
}

// ツリー構造を構築するヘルパー関数
function buildStakeholderTree(
  stakeholders: ProjectStakeholder[]
): StakeholderTreeNode[] {
  const stakeholderMap = new Map<string, StakeholderTreeNode>();

  // まず、すべてのステークホルダーをマップに追加
  stakeholders.forEach((stakeholder) => {
    stakeholderMap.set(stakeholder.id, {
      ...stakeholder,
      children: [],
    });
  });

  const rootNodes: StakeholderTreeNode[] = [];

  // 親子関係を構築
  stakeholders.forEach((stakeholder) => {
    const node = stakeholderMap.get(stakeholder.id)!;
    if (stakeholder.parentStakeholderId) {
      const parent = stakeholderMap.get(stakeholder.parentStakeholderId);
      if (parent) {
        parent.children.push(node);
      } else {
        // 親が見つからない場合はルートに追加
        rootNodes.push(node);
      }
    } else {
      // 親がない場合はルートノード
      rootNodes.push(node);
    }
  });

  // ティアでソート（Tier 1が最初）
  const sortByTier = (nodes: StakeholderTreeNode[]): StakeholderTreeNode[] => {
    return nodes.sort((a, b) => a.tier - b.tier).map((node) => ({
      ...node,
      children: sortByTier(node.children),
    }));
  };

  return sortByTier(rootNodes);
}

export const stakeholderService = {
  // プロジェクトのステークホルダー一覧を取得
  getByProjectId: async (
    projectId: string,
    params?: StakeholderListParams
  ): Promise<ProjectStakeholder[]> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    const response = await api.get<{
      success: boolean;
      data: ProjectStakeholder[];
    }>(`/projects/${projectId}/stakeholders${query ? `?${query}` : ''}`);
    return extractData(response);
  },

  // プロジェクトのステークホルダーをツリー構造で取得
  getTreeByProjectId: async (
    projectId: string
  ): Promise<StakeholderTreeNode[]> => {
    const response = await api.get<{
      success: boolean;
      data: ProjectStakeholder[];
    }>(`/projects/${projectId}/stakeholders`);
    const stakeholders = extractData(response);
    return buildStakeholderTree(stakeholders);
  },

  // 単一のステークホルダーを取得
  getById: async (
    projectId: string,
    stakeholderId: string
  ): Promise<ProjectStakeholder> => {
    const response = await api.get<{
      success: boolean;
      data: ProjectStakeholder;
    }>(`/projects/${projectId}/stakeholders/${stakeholderId}`);
    return extractData(response);
  },

  // ステークホルダーを追加
  create: async (data: StakeholderInput): Promise<ProjectStakeholder> => {
    const response = await api.post<{
      success: boolean;
      data: ProjectStakeholder;
    }>(`/projects/${data.projectId}/stakeholders`, data);
    return extractData(response);
  },

  // ステークホルダーを更新
  update: async (
    projectId: string,
    stakeholderId: string,
    data: Partial<StakeholderInput>
  ): Promise<ProjectStakeholder> => {
    const response = await api.patch<{
      success: boolean;
      data: ProjectStakeholder;
    }>(`/projects/${projectId}/stakeholders/${stakeholderId}`, data);
    return extractData(response);
  },

  // ステークホルダーを削除
  delete: async (projectId: string, stakeholderId: string): Promise<void> => {
    await api.delete<void>(
      `/projects/${projectId}/stakeholders/${stakeholderId}`
    );
  },
};
