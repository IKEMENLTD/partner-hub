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
    // バックエンドのツリーエンドポイントを使用（tier1/tier2/tier3形式）
    const response = await api.get<{
      success: boolean;
      data: {
        tier1: StakeholderTreeNode[];
        tier2: StakeholderTreeNode[];
        tier3: StakeholderTreeNode[];
      };
    }>(`/projects/${projectId}/stakeholders/tree`);

    const treeData = extractData(response);

    // tier1/tier2/tier3を結合し、ルートノードのみ取得（子は既にネスト済み）
    const allNodes = [
      ...(treeData.tier1 || []),
      ...(treeData.tier2 || []),
      ...(treeData.tier3 || []),
    ];

    // parentStakeholderIdがないノード = ルートノード
    // 子ノードは親のchildrenに既に含まれているので重複を除外
    const rootNodes = allNodes.filter((node) => !node.parentStakeholderId);

    // ティアでソート（Tier 1が最初）
    return rootNodes.sort((a, b) => a.tier - b.tier);
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
    _projectId: string,
    stakeholderId: string,
    data: Partial<StakeholderInput>
  ): Promise<ProjectStakeholder> => {
    const response = await api.patch<{
      success: boolean;
      data: ProjectStakeholder;
    }>(`/stakeholders/${stakeholderId}`, data);
    return extractData(response);
  },

  // ステークホルダーを削除
  delete: async (_projectId: string, stakeholderId: string): Promise<void> => {
    await api.delete<void>(
      `/stakeholders/${stakeholderId}`
    );
  },
};
