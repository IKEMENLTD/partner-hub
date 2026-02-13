import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Building2,
  Users,
  UserCheck,
  Trash2,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import {
  superAdminService,
  type SuperAdminOrganization,
  type SuperAdminUser,
} from '@/services/superAdminService';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Modal,
  PageLoading,
  ErrorMessage,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/common';

type TabType = 'organizations' | 'users';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function SuperAdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('organizations');

  // Confirm modals
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'user' | 'organization';
    id: string;
    name: string;
  }>({ isOpen: false, type: 'user', id: '', name: '' });

  const [saModal, setSaModal] = useState<{
    isOpen: boolean;
    action: 'grant' | 'revoke';
    userId: string;
    userName: string;
  }>({ isOpen: false, action: 'grant', userId: '', userName: '' });

  // Queries
  const statsQuery = useQuery({
    queryKey: ['super-admin', 'stats'],
    queryFn: () => superAdminService.getStats(),
  });

  const orgsQuery = useQuery({
    queryKey: ['super-admin', 'organizations'],
    queryFn: () => superAdminService.getOrganizations(),
    enabled: activeTab === 'organizations',
  });

  const usersQuery = useQuery({
    queryKey: ['super-admin', 'users'],
    queryFn: () => superAdminService.getUsers(),
    enabled: activeTab === 'users',
  });

  // Mutations
  const deleteOrgMutation = useMutation({
    mutationFn: (id: string) => superAdminService.deleteOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin'] });
      setDeleteModal((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => superAdminService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin'] });
      setDeleteModal((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const setSuperAdminMutation = useMutation({
    mutationFn: (id: string) => superAdminService.setSuperAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin'] });
      setSaModal((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const revokeSuperAdminMutation = useMutation({
    mutationFn: (id: string) => superAdminService.revokeSuperAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin'] });
      setSaModal((prev) => ({ ...prev, isOpen: false }));
    },
  });

  const handleDelete = () => {
    if (deleteModal.type === 'organization') {
      deleteOrgMutation.mutate(deleteModal.id);
    } else {
      deleteUserMutation.mutate(deleteModal.id);
    }
  };

  const handleSaToggle = () => {
    if (saModal.action === 'grant') {
      setSuperAdminMutation.mutate(saModal.userId);
    } else {
      revokeSuperAdminMutation.mutate(saModal.userId);
    }
  };

  if (statsQuery.isLoading) {
    return <PageLoading />;
  }

  if (statsQuery.isError) {
    return (
      <ErrorMessage
        message={statsQuery.error instanceof Error ? statsQuery.error.message : 'データの取得に失敗しました'}
        retry={() => statsQuery.refetch()}
      />
    );
  }

  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            システム管理
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            全組織・全ユーザーの管理を行います
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">組織数</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats?.totalOrganizations ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">ユーザー数</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats?.totalUsers ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <UserCheck className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">アクティブユーザー</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats?.activeUsers ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('organizations')}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'organizations'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Building2 className="mr-2 inline h-4 w-4" />
            組織一覧
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Users className="mr-2 inline h-4 w-4" />
            ユーザー一覧
          </button>
        </nav>
      </div>

      {/* Organization Tab */}
      {activeTab === 'organizations' && (
        <Card padding="none">
          <CardHeader className="px-4 pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <span>組織一覧 ({orgsQuery.data?.length || 0})</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {orgsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>プラン</TableHead>
                    <TableHead>メンバー数</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>作成日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgsQuery.data && orgsQuery.data.length > 0 ? (
                    orgsQuery.data.map((org: SuperAdminOrganization) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <span className="font-medium">{org.name}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-500 dark:text-gray-400 text-xs font-mono">
                            {org.slug}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="primary">{org.plan}</Badge>
                        </TableCell>
                        <TableCell>{org.memberCount}</TableCell>
                        <TableCell>
                          {org.isActive ? (
                            <Badge variant="success" dot>有効</Badge>
                          ) : (
                            <Badge variant="default" dot>無効</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">{formatDate(org.createdAt)}</span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteModal({
                                isOpen: true,
                                type: 'organization',
                                id: org.id,
                                name: org.name,
                              })
                            }
                            leftIcon={<Trash2 className="h-4 w-4" />}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            削除
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <td className="text-center text-gray-500 py-8 px-4" colSpan={7}>
                        組織が見つかりません
                      </td>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card padding="none">
          <CardHeader className="px-4 pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <span>ユーザー一覧 ({usersQuery.data?.length || 0})</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {usersQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>メール</TableHead>
                    <TableHead>所属組織</TableHead>
                    <TableHead>ロール</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersQuery.data && usersQuery.data.length > 0 ? (
                    usersQuery.data.map((user: SuperAdminUser) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {user.lastName} {user.firstName}
                            </span>
                            {user.isSuperAdmin && (
                              <Badge variant="danger">
                                <Shield className="mr-1 inline h-3 w-3" />
                                SA
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-500 dark:text-gray-400">{user.email}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {user.organizationName || (
                              <span className="text-gray-400">-</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'danger' : 'primary'}>
                            {user.role === 'admin' ? '管理者' : user.role === 'member' ? 'メンバー' : user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.isActive ? (
                            <Badge variant="success" dot>有効</Badge>
                          ) : (
                            <Badge variant="default" dot>無効</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {user.isSuperAdmin ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setSaModal({
                                    isOpen: true,
                                    action: 'revoke',
                                    userId: user.id,
                                    userName: `${user.lastName} ${user.firstName}`.trim() || user.email,
                                  })
                                }
                                leftIcon={<ShieldOff className="h-4 w-4" />}
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                title="SA権限を剥奪"
                              >
                                SA解除
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setSaModal({
                                    isOpen: true,
                                    action: 'grant',
                                    userId: user.id,
                                    userName: `${user.lastName} ${user.firstName}`.trim() || user.email,
                                  })
                                }
                                leftIcon={<ShieldCheck className="h-4 w-4" />}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                title="SA権限を付与"
                              >
                                SA付与
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  type: 'user',
                                  id: user.id,
                                  name: `${user.lastName} ${user.firstName}`.trim() || user.email,
                                })
                              }
                              leftIcon={<Trash2 className="h-4 w-4" />}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="削除"
                            >
                              削除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <td className="text-center text-gray-500 py-8 px-4" colSpan={6}>
                        ユーザーが見つかりません
                      </td>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
        title={deleteModal.type === 'organization' ? '組織の削除' : 'ユーザーの削除'}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <Trash2 className="h-10 w-10 text-red-400 flex-shrink-0" />
            <p>
              {deleteModal.type === 'organization'
                ? `組織「${deleteModal.name}」を完全に削除しますか？メンバーの所属も解除されます。この操作は取り消せません。`
                : `ユーザー「${deleteModal.name}」を完全に削除しますか？Supabase Authからも削除されます。この操作は取り消せません。`}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-slate-700">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
            >
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteOrgMutation.isPending || deleteUserMutation.isPending}
            >
              削除する
            </Button>
          </div>
        </div>
      </Modal>

      {/* SA Permission Modal */}
      <Modal
        isOpen={saModal.isOpen}
        onClose={() => setSaModal((prev) => ({ ...prev, isOpen: false }))}
        title={saModal.action === 'grant' ? 'システム管理者権限の付与' : 'システム管理者権限の剥奪'}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            {saModal.action === 'grant' ? (
              <ShieldCheck className="h-10 w-10 text-blue-500 flex-shrink-0" />
            ) : (
              <ShieldOff className="h-10 w-10 text-amber-500 flex-shrink-0" />
            )}
            <p>
              {saModal.action === 'grant'
                ? `${saModal.userName} にシステム管理者権限を付与しますか？全組織・全ユーザーの管理が可能になります。`
                : `${saModal.userName} のシステム管理者権限を剥奪しますか？`}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-slate-700">
            <Button
              variant="ghost"
              onClick={() => setSaModal((prev) => ({ ...prev, isOpen: false }))}
            >
              キャンセル
            </Button>
            <Button
              variant={saModal.action === 'grant' ? 'primary' : 'danger'}
              onClick={handleSaToggle}
              isLoading={setSuperAdminMutation.isPending || revokeSuperAdminMutation.isPending}
            >
              {saModal.action === 'grant' ? '権限を付与' : '権限を剥奪'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
