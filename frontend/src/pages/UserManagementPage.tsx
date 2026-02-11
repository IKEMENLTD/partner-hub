import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Shield, UserCheck, UserX } from 'lucide-react';
import { userService } from '@/services/userService';
import type { UserProfile } from '@/services/userService';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Modal,
  PageLoading,
  ErrorMessage,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/common';

const ROLE_OPTIONS = [
  { value: 'admin', label: '管理者' },
  { value: 'manager', label: 'マネージャー' },
  { value: 'member', label: 'メンバー' },
];

const roleBadgeConfig: Record<string, { variant: 'danger' | 'warning' | 'primary'; label: string }> = {
  admin: { variant: 'danger', label: '管理者' },
  manager: { variant: 'warning', label: 'マネージャー' },
  member: { variant: 'primary', label: 'メンバー' },
};

function getRoleBadge(role: string) {
  const config = roleBadgeConfig[role] || { variant: 'primary' as const, label: role };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getStatusBadge(isActive: boolean) {
  return isActive ? (
    <Badge variant="success" dot>有効</Badge>
  ) : (
    <Badge variant="default" dot>無効</Badge>
  );
}

export function UserManagementPage() {
  const queryClient = useQueryClient();

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    action: 'activate' | 'deactivate';
  }>({ isOpen: false, userId: '', userName: '', action: 'deactivate' });

  // Fetch users
  const {
    data: users,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getAll(),
  });

  // Role update mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      userService.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => userService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
  });

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: (id: string) => userService.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ id: userId, role: newRole });
  };

  const handleToggleStatus = (user: UserProfile) => {
    const fullName = `${user.lastName} ${user.firstName}`.trim() || user.email;
    setConfirmModal({
      isOpen: true,
      userId: user.id,
      userName: fullName,
      action: user.isActive ? 'deactivate' : 'activate',
    });
  };

  const handleConfirmToggle = () => {
    if (confirmModal.action === 'deactivate') {
      deactivateMutation.mutate(confirmModal.userId);
    } else {
      activateMutation.mutate(confirmModal.userId);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (isError) {
    return (
      <ErrorMessage
        message={error instanceof Error ? error.message : 'ユーザー一覧の取得に失敗しました'}
        retry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">ユーザー管理</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            組織内のユーザーアカウントとロールを管理します
          </p>
        </div>
      </div>

      {/* User Table */}
      <Card padding="none">
        <CardHeader className="px-4 pt-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span>ユーザー一覧 ({users?.length || 0})</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>メール</TableHead>
                <TableHead>ロール</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">
                        {user.lastName} {user.firstName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-500 dark:text-gray-400">{user.email}</span>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.isActive)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Role change select */}
                        <Select
                          options={ROLE_OPTIONS}
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="!min-h-[36px] !py-1 w-36"
                          disabled={updateRoleMutation.isPending}
                        />
                        {/* Activate / Deactivate button */}
                        {user.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                            leftIcon={<UserX className="h-4 w-4" />}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="無効化"
                          >
                            無効化
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                            leftIcon={<UserCheck className="h-4 w-4" />}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                            title="有効化"
                          >
                            有効化
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <td className="text-center text-gray-500 py-8 px-4" colSpan={5}>
                    ユーザーが見つかりません
                  </td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirm Activate/Deactivate Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.action === 'deactivate' ? 'ユーザーの無効化' : 'ユーザーの有効化'}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            {confirmModal.action === 'deactivate' ? (
              <Shield className="h-10 w-10 text-red-400 flex-shrink-0" />
            ) : (
              <Shield className="h-10 w-10 text-green-500 flex-shrink-0" />
            )}
            <p>
              {confirmModal.action === 'deactivate'
                ? `${confirmModal.userName} を無効化しますか？このユーザーはシステムにログインできなくなります。`
                : `${confirmModal.userName} を有効化しますか？このユーザーはシステムにログインできるようになります。`}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-slate-700">
            <Button
              variant="ghost"
              onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
            >
              キャンセル
            </Button>
            <Button
              variant={confirmModal.action === 'deactivate' ? 'danger' : 'primary'}
              onClick={handleConfirmToggle}
              isLoading={deactivateMutation.isPending || activateMutation.isPending}
            >
              {confirmModal.action === 'deactivate' ? '無効化する' : '有効化する'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
