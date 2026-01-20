import { useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import type { ProjectMember, ProjectMemberRole } from '@/types';
import { getUserDisplayName } from '@/types';
import { Avatar, Badge, Button, EmptyState, Modal, ModalFooter } from '@/components/common';

interface ProjectMembersProps {
  members: ProjectMember[];
  onAddMember?: () => void;
  onRemoveMember?: (memberId: string) => void;
  canManage?: boolean;
}

const roleConfig: Record<ProjectMemberRole, { label: string; variant: 'primary' | 'info' | 'default' | 'warning' }> = {
  owner: { label: 'オーナー', variant: 'primary' },
  manager: { label: 'マネージャー', variant: 'info' },
  member: { label: 'メンバー', variant: 'default' },
  viewer: { label: '閲覧者', variant: 'warning' },
};

export function ProjectMembers({
  members,
  onAddMember,
  onRemoveMember,
  canManage = false,
}: ProjectMembersProps) {
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const handleRemove = () => {
    if (selectedMember && onRemoveMember) {
      onRemoveMember(selectedMember.id);
      setShowRemoveConfirm(false);
      setSelectedMember(null);
    }
  };

  if (members.length === 0) {
    return (
      <EmptyState
        title="メンバーがいません"
        description="プロジェクトにメンバーを追加してください"
        action={
          canManage && onAddMember && (
            <Button
              leftIcon={<UserPlus className="h-4 w-4" />}
              onClick={onAddMember}
            >
              メンバーを追加
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {members.length} 名のメンバー
        </span>
        {canManage && onAddMember && (
          <Button
            size="sm"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={onAddMember}
          >
            メンバーを追加
          </Button>
        )}
      </div>

      {/* Member list */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => {
          const role = roleConfig[member.role];

          return (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  name={getUserDisplayName(member.user)}
                  src={member.user.avatarUrl}
                  size="md"
                />
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {getUserDisplayName(member.user)}
                  </h4>
                  <Badge variant={role.variant} size="sm" className="mt-1">
                    {role.label}
                  </Badge>
                </div>
              </div>

              {canManage && member.role !== 'owner' && (
                <div className="relative">
                  <button
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-500 dark:hover:bg-slate-700 dark:hover:text-gray-400"
                    onClick={() => {
                      setSelectedMember(member);
                      setShowRemoveConfirm(true);
                    }}
                    aria-label="メンバーを削除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Remove confirmation modal */}
      <Modal
        isOpen={showRemoveConfirm}
        onClose={() => {
          setShowRemoveConfirm(false);
          setSelectedMember(null);
        }}
        title="メンバーの削除"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          {getUserDisplayName(selectedMember?.user)} をプロジェクトから削除しますか？
          この操作は取り消せません。
        </p>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setShowRemoveConfirm(false);
              setSelectedMember(null);
            }}
          >
            キャンセル
          </Button>
          <Button variant="danger" onClick={handleRemove}>
            削除
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
