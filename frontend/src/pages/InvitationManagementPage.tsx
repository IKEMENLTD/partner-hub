import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Send, X, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button, Alert } from '@/components/common';
import { useAuthStore } from '@/store';
import { organizationService, type OrganizationInvitation } from '@/services/organizationService';
import { InvitationForm } from '@/components/settings/InvitationForm';

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  pending: { label: '保留中', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  accepted: { label: '承認済み', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  expired: { label: '期限切れ', color: 'text-gray-500 bg-gray-50', icon: AlertTriangle },
  cancelled: { label: 'キャンセル済み', color: 'text-red-500 bg-red-50', icon: XCircle },
};

export function InvitationManagementPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const orgId = (user as any)?.organizationId;

  const { data, isLoading, error } = useQuery({
    queryKey: ['invitations', orgId, statusFilter, page],
    queryFn: () =>
      organizationService.listInvitations(orgId, {
        status: statusFilter || undefined,
        page,
        limit: 10,
      }),
    enabled: !!orgId,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => organizationService.cancelInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => organizationService.resendInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  const invitations: OrganizationInvitation[] = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / 10);

  if (!orgId) {
    return (
      <div className="p-6">
        <Alert variant="warning">組織に所属していないため、招待管理を利用できません。</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">メンバー招待</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            組織にメンバーを招待して、一緒にプロジェクトを管理しましょう
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          leftIcon={<UserPlus className="h-4 w-4" />}
        >
          新しい招待
        </Button>
      </div>

      {showForm && (
        <InvitationForm
          orgId={orgId}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
          }}
        />
      )}

      {/* Status filter */}
      <div className="flex gap-2">
        {[
          { value: '', label: 'すべて' },
          { value: 'pending', label: '保留中' },
          { value: 'accepted', label: '承認済み' },
          { value: 'expired', label: '期限切れ' },
          { value: 'cancelled', label: 'キャンセル済み' },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => { setStatusFilter(filter.value); setPage(1); }}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              statusFilter === filter.value
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-400'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && (
        <Alert variant="error">招待一覧の取得に失敗しました</Alert>
      )}

      {/* Invitations table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                メールアドレス
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                ロール
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                ステータス
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                有効期限
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                アクション
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                    読み込み中...
                  </div>
                </td>
              </tr>
            ) : invitations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  招待がありません
                </td>
              </tr>
            ) : (
              invitations.map((inv) => {
                const config = statusConfig[inv.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {inv.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {inv.role === 'admin' ? '管理者' : inv.role === 'manager' ? 'マネージャー' : 'メンバー'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(inv.expiresAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => resendMutation.mutate(inv.id)}
                            disabled={resendMutation.isPending}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-slate-800"
                            title="再送信"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => cancelMutation.mutate(inv.id)}
                            disabled={cancelMutation.isPending}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-slate-800"
                            title="キャンセル"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {total}件中 {(page - 1) * 10 + 1}-{Math.min(page * 10, total)}件を表示
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              前へ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              次へ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
