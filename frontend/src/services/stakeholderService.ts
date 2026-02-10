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

    // tier1/tier2/tier3を結合
    const allNodes = [
      ...(treeData.tier1 || []),
      ...(treeData.tier2 || []),
      ...(treeData.tier3 || []),
    ];

    // parentStakeholderIdがないノード = ルートノード
    // 明示的な親子関係があるノードは親のchildrenに既に含まれている
    const rootNodes = allNodes.filter((node) => !node.parentStakeholderId);
    if (rootNodes.length === 0) return [];

    // Tierでグループ化
    const byTier: Record<number, StakeholderTreeNode[]> = {};
    for (const node of rootNodes) {
      if (!byTier[node.tier]) byTier[node.tier] = [];
      byTier[node.tier].push(node);
    }

    const tiers = Object.keys(byTier).map(Number).sort((a, b) => a - b);

    // Tierが1種類だけならそのまま返す
    if (tiers.length <= 1) return rootNodes;

    // 自動ネスト: parentStakeholderIdが未設定の場合、
    // 上位Tierの最初のノードの下に下位Tierの孤立ノードを配置
    for (let i = 1; i < tiers.length; i++) {
      const parentTier = tiers[i - 1];
      const orphans = byTier[tiers[i]];
      const parentCandidates = byTier[parentTier];
      if (parentCandidates && parentCandidates.length > 0 && orphans.length > 0) {
        parentCandidates[0].children = [
          ...(parentCandidates[0].children || []),
          ...orphans,
        ];
      }
    }

    // 最上位Tierのノードをルートとして返す
    return byTier[tiers[0]];
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
