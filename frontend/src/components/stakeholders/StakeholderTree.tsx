import { useState, useCallback, useEffect } from 'react';
import clsx from 'clsx';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Users,
  Star,
  Building,
  User,
} from 'lucide-react';
import type { StakeholderTreeNode, ProjectStakeholder, StakeholderTier } from '@/types';
import { getUserDisplayName, getPartnerDisplayName } from '@/types';
import { Avatar, Badge, Button, Card, CardHeader, CardContent, EmptyState } from '@/components/common';

interface StakeholderTreeProps {
  tree: StakeholderTreeNode[];
  isLoading?: boolean;
  onAdd?: () => void;
  onEdit?: (stakeholder: ProjectStakeholder) => void;
  onDelete?: (stakeholder: ProjectStakeholder) => void;
  onSelect?: (stakeholder: ProjectStakeholder) => void;
  className?: string;
}

const tierConfig: Record<
  StakeholderTier,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  1: {
    label: 'Tier 1',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  2: {
    label: 'Tier 2',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  3: {
    label: 'Tier 3',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    borderColor: 'border-gray-200 dark:border-gray-700',
  },
};

function getNodeName(node: StakeholderTreeNode): string {
  if (node.user) {
    return getUserDisplayName(node.user);
  }
  if (node.partner) {
    return getPartnerDisplayName(node.partner);
  }
  return '不明';
}

function getNodeAvatar(node: StakeholderTreeNode): {
  src?: string | null;
  name: string;
} {
  if (node.user) {
    return {
      src: node.user.avatarUrl,
      name: getUserDisplayName(node.user),
    };
  }
  if (node.partner) {
    return {
      src: null,
      name: getPartnerDisplayName(node.partner),
    };
  }
  return { src: null, name: '不明' };
}

interface TreeNodeProps {
  node: StakeholderTreeNode;
  level: number;
  expandedNodes: Set<string>;
  toggleExpand: (id: string) => void;
  onSelect?: (stakeholder: ProjectStakeholder) => void;
  hoveredNode: string | null;
  setHoveredNode: (id: string | null) => void;
}

function TreeNode({
  node,
  level,
  expandedNodes,
  toggleExpand,
  onSelect,
  hoveredNode,
  setHoveredNode,
}: TreeNodeProps) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const tier = tierConfig[node.tier];
  const avatarInfo = getNodeAvatar(node);
  const name = getNodeName(node);
  const isHovered = hoveredNode === node.id;

  return (
    <div className="relative">
      {/* Connection line to parent */}
      {level > 0 && (
        <div
          className="absolute left-0 top-0 h-1/2 w-6 border-l-2 border-b-2 border-gray-300 dark:border-gray-600 rounded-bl-lg"
          style={{ marginLeft: `${(level - 1) * 24 + 12}px` }}
        />
      )}

      {/* Node */}
      <div
        className={clsx(
          'relative flex items-center gap-2 py-2',
          level > 0 && 'ml-6'
        )}
        style={{ paddingLeft: `${level * 24}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => toggleExpand(node.id)}
            className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            aria-label={isExpanded ? '折りたたむ' : '展開する'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Node Content */}
        <div
          className={clsx(
            'flex-1 flex items-center gap-3 px-3 py-2 rounded-lg border transition-all cursor-pointer',
            tier.bgColor,
            tier.borderColor,
            isHovered && 'ring-2 ring-primary-500 ring-offset-1'
          )}
          onClick={() => onSelect?.(node)}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelect?.(node);
            }
          }}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar src={avatarInfo.src} name={avatarInfo.name} size="sm" />
            {node.isKeyPerson && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-400 flex items-center justify-center">
                <Star className="h-2.5 w-2.5 text-yellow-900 fill-current" />
              </span>
            )}
          </div>

          {/* Name & Role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {name}
              </span>
              {node.user && (
                <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              )}
              {node.partner && (
                <Building className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              )}
            </div>
            {node.roleDescription && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {node.roleDescription}
              </p>
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {node.isPrimary && (
              <Badge variant="primary" size="sm">
                主担当
              </Badge>
            )}
            <Badge className={clsx(tier.bgColor, tier.color, 'border', tier.borderColor)} size="sm">
              {tier.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Hover Tooltip */}
      {isHovered && node.responsibilities && (
        <div
          className="absolute z-10 left-1/2 transform -translate-x-1/2 mt-1 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg max-w-xs"
          style={{ top: '100%' }}
        >
          <p className="font-medium mb-1">責任範囲:</p>
          <p>{node.responsibilities}</p>
          {node.contactInfo?.email && (
            <p className="mt-1 text-gray-300">{node.contactInfo.email}</p>
          )}
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Vertical line connecting children */}
          <div
            className="absolute border-l-2 border-gray-300 dark:border-gray-600"
            style={{
              left: `${level * 24 + 36}px`,
              top: 0,
              height: 'calc(100% - 24px)',
            }}
          />
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
              hoveredNode={hoveredNode}
              setHoveredNode={setHoveredNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function StakeholderTree({
  tree,
  isLoading,
  onAdd,
  onEdit,
  onDelete: _onDelete,
  onSelect,
  className,
}: StakeholderTreeProps) {
  // Note: onDelete is available via props but tree nodes use onSelect/onEdit for editing flow
  void _onDelete;
  // すべてのノードを展開状態で初期化
  const getAllNodeIds = useCallback((nodes: StakeholderTreeNode[]): string[] => {
    return nodes.flatMap((node) => [
      node.id,
      ...getAllNodeIds(node.children || []),
    ]);
  }, []);

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    return new Set(getAllNodeIds(tree));
  });

  // ツリーデータが非同期で読み込まれた時にexpandedNodesを同期
  useEffect(() => {
    if (tree.length > 0) {
      setExpandedNodes(new Set(getAllNodeIds(tree)));
    }
  }, [tree, getAllNodeIds]);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedNodes(new Set(getAllNodeIds(tree)));
  }, [getAllNodeIds, tree]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>関係者ツリー</CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse space-y-3 w-full">
              <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded-lg" />
              <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded-lg ml-8" />
              <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded-lg ml-8" />
              <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded-lg ml-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              全て展開
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              全て折りたたむ
            </button>
            {onAdd && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={onAdd}
              >
                追加
              </Button>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          関係者ツリー
        </div>
      </CardHeader>
      <CardContent>
        {tree.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="関係者がいません"
            description="プロジェクトに関係者を追加してください"
            action={
              onAdd ? (
                <Button
                  variant="primary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={onAdd}
                >
                  関係者を追加
                </Button>
              ) : undefined
            }
            className="py-8"
          />
        ) : (
          <div className="space-y-1">
            {/* Tier Legend */}
            <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
              {([1, 2, 3] as StakeholderTier[]).map((tier) => {
                const config = tierConfig[tier];
                return (
                  <div key={tier} className="flex items-center gap-1.5">
                    <span
                      className={clsx(
                        'inline-block w-3 h-3 rounded',
                        config.bgColor,
                        'border',
                        config.borderColor
                      )}
                    />
                    <span className={clsx('text-xs', config.color)}>
                      {config.label}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center gap-1.5">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  キーパーソン
                </span>
              </div>
            </div>

            {/* Tree */}
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                level={0}
                expandedNodes={expandedNodes}
                toggleExpand={toggleExpand}
                onSelect={onSelect || onEdit}
                hoveredNode={hoveredNode}
                setHoveredNode={setHoveredNode}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ティアごとにグループ化したリスト表示
interface StakeholderListByTierProps {
  stakeholders: ProjectStakeholder[];
  onEdit?: (stakeholder: ProjectStakeholder) => void;
  onDelete?: (stakeholder: ProjectStakeholder) => void;
  onAdd?: () => void;
  className?: string;
}

export function StakeholderListByTier({
  stakeholders,
  onEdit,
  onDelete: _onDelete,
  onAdd: _onAdd,
  className,
}: StakeholderListByTierProps) {
  // Note: onDelete and onAdd are available via props for future implementation
  void _onDelete;
  void _onAdd;
  const groupedByTier = stakeholders.reduce(
    (acc, stakeholder) => {
      const tier = stakeholder.tier;
      if (!acc[tier]) {
        acc[tier] = [];
      }
      acc[tier].push(stakeholder);
      return acc;
    },
    {} as Record<StakeholderTier, ProjectStakeholder[]>
  );

  return (
    <div className={clsx('space-y-6', className)}>
      {([1, 2, 3] as StakeholderTier[]).map((tier) => {
        const tierStakeholders = groupedByTier[tier] || [];
        const config = tierConfig[tier];

        if (tierStakeholders.length === 0) return null;

        return (
          <div key={tier}>
            <h4
              className={clsx(
                'flex items-center gap-2 text-sm font-semibold mb-3',
                config.color
              )}
            >
              <span
                className={clsx(
                  'inline-block w-3 h-3 rounded',
                  config.bgColor,
                  'border',
                  config.borderColor
                )}
              />
              {config.label}
              <span className="text-gray-400 dark:text-gray-500 font-normal">
                ({tierStakeholders.length})
              </span>
            </h4>
            <div className="grid-cards">
              {tierStakeholders.map((stakeholder) => (
                <div
                  key={stakeholder.id}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                    config.bgColor,
                    config.borderColor,
                    'hover:shadow-sm'
                  )}
                  onClick={() => onEdit?.(stakeholder)}
                >
                  <div className="relative">
                    <Avatar
                      src={
                        stakeholder.user?.avatarUrl ||
                        null
                      }
                      name={getNodeName(stakeholder as StakeholderTreeNode)}
                      size="sm"
                    />
                    {stakeholder.isKeyPerson && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-400 flex items-center justify-center">
                        <Star className="h-2.5 w-2.5 text-yellow-900 fill-current" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {getNodeName(stakeholder as StakeholderTreeNode)}
                    </p>
                    {stakeholder.roleDescription && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {stakeholder.roleDescription}
                      </p>
                    )}
                  </div>
                  {stakeholder.isPrimary && (
                    <Badge variant="primary" size="sm">
                      主担当
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
