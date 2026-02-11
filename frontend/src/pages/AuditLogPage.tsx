import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { FileSearch, Filter, RefreshCw, Clock } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  PageLoading,
  ErrorMessage,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/common';
import { auditService } from '@/services/auditService';
import type { AuditLog, AuditFilter } from '@/services/auditService';

// -- Constants --

const ENTITY_OPTIONS = [
  { value: '', label: '全て' },
  { value: 'Project', label: '案件' },
  { value: 'Task', label: 'タスク' },
  { value: 'Partner', label: 'パートナー' },
  { value: 'ReportConfig', label: 'レポート設定' },
  { value: 'EscalationRule', label: 'エスカレーション' },
];

const ACTION_OPTIONS = [
  { value: '', label: '全て' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'SOFT_DELETE', label: 'SOFT_DELETE' },
];

const PAGE_SIZE = 50;

const ENTITY_LABEL_MAP: Record<string, string> = {
  Project: '案件',
  Task: 'タスク',
  Partner: 'パートナー',
  ReportConfig: 'レポート設定',
  EscalationRule: 'エスカレーション',
};

type ActionBadgeVariant = 'success' | 'warning' | 'danger' | 'default';

const ACTION_BADGE_MAP: Record<string, ActionBadgeVariant> = {
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'danger',
  SOFT_DELETE: 'danger',
  READ: 'default',
};

// -- Helper Functions --

function getEntityLabel(entityName: string): string {
  return ENTITY_LABEL_MAP[entityName] || entityName;
}

function getActionBadgeVariant(action: string): ActionBadgeVariant {
  return ACTION_BADGE_MAP[action] || 'default';
}

function formatDateTime(dateString: string): string {
  try {
    return format(new Date(dateString), 'yyyy/MM/dd HH:mm:ss', { locale: ja });
  } catch {
    return dateString;
  }
}

function formatShortDateTime(dateString: string): string {
  try {
    return format(new Date(dateString), 'M/d HH:mm', { locale: ja });
  } catch {
    return dateString;
  }
}

// -- Component --

export function AuditLogPage() {
  // Filter state
  const [entityName, setEntityName] = useState('');
  const [action, setAction] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Build filter params
  const buildFilterParams = useCallback((): AuditFilter => {
    const params: AuditFilter = {
      page: currentPage,
      limit: PAGE_SIZE,
    };
    if (entityName) params.entityName = entityName;
    if (action) params.action = action;
    if (userEmail.trim()) params.userEmail = userEmail.trim();
    if (startDate) params.startDate = new Date(startDate).toISOString();
    if (endDate) params.endDate = new Date(endDate + 'T23:59:59').toISOString();
    return params;
  }, [entityName, action, userEmail, startDate, endDate, currentPage]);

  // Queries
  const {
    data: paginatedResult,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['audit-logs', entityName, action, userEmail, startDate, endDate, currentPage],
    queryFn: () => auditService.getAll(buildFilterParams()),
  });

  const {
    data: recentLogs,
    isLoading: isLoadingRecent,
  } = useQuery({
    queryKey: ['audit-logs-recent'],
    queryFn: () => auditService.getRecent(10),
  });

  const logs = paginatedResult?.data || [];
  const totalPages = paginatedResult?.totalPages || 0;
  const total = paginatedResult?.total || 0;

  // Handlers
  const handleClearFilters = () => {
    setEntityName('');
    setAction('');
    setUserEmail('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasFilters = entityName || action || userEmail.trim() || startDate || endDate;

  const handleLoadMore = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const handleApplyFilter = () => {
    setCurrentPage(1);
  };

  // Loading state
  if (isLoading && currentPage === 1) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">監査ログ</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            システム操作の履歴を確認できます
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => refetch()}
        >
          更新
        </Button>
      </div>

      {/* Recent Activity Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            最近のアクティビティ
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingRecent ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : !recentLogs || recentLogs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-2">最近のアクティビティはありません</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 dark:bg-slate-700 px-3 py-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                      {log.action}
                    </Badge>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      <span className="font-medium">{getEntityLabel(log.entityName)}</span>
                      {log.userEmail && (
                        <span className="text-gray-500 dark:text-gray-400 ml-2">
                          by {log.userEmail}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {formatShortDateTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            フィルター
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              クリア
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <Select
              label="エンティティ"
              value={entityName}
              onChange={(e) => {
                setEntityName(e.target.value);
                handleApplyFilter();
              }}
              options={ENTITY_OPTIONS}
            />
            <Select
              label="アクション"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                handleApplyFilter();
              }}
              options={ACTION_OPTIONS}
            />
            <Input
              label="メールアドレス"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              onBlur={handleApplyFilter}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyFilter();
              }}
              placeholder="メールアドレスで検索"
            />
            <Input
              label="開始日"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                handleApplyFilter();
              }}
            />
            <Input
              label="終了日"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                handleApplyFilter();
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card padding="none">
        <div className="px-3 py-3 sm:px-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              監査ログ一覧
              {total > 0 && (
                <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">
                  ({total}件)
                </span>
              )}
            </h2>
          </div>
        </div>

        {isError ? (
          <div className="p-4">
            <ErrorMessage
              message={error instanceof Error ? error.message : '監査ログの取得に失敗しました'}
              retry={() => refetch()}
            />
          </div>
        ) : logs.length === 0 && !isLoading ? (
          <EmptyState
            icon={<FileSearch className="h-12 w-12" />}
            title="監査ログが見つかりません"
            description={hasFilters ? 'フィルター条件を変更してお試しください' : 'まだ監査ログがありません'}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>ユーザー</TableHead>
                  <TableHead>アクション</TableHead>
                  <TableHead>エンティティ</TableHead>
                  <TableHead>エンティティID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: AuditLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={log.userEmail || log.userId}>
                        {log.userEmail || log.userId || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getEntityLabel(log.entityName)}
                    </TableCell>
                    <TableCell>
                      <span
                        className="font-mono text-xs text-gray-500 dark:text-gray-400 max-w-[180px] truncate block"
                        title={log.entityId}
                      >
                        {log.entityId}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Load More / Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {total > 0
                  ? `${Math.min(currentPage * PAGE_SIZE, total)} / ${total}件 表示中`
                  : ''}
              </p>
              {currentPage < totalPages && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  isLoading={isLoading && currentPage > 1}
                >
                  もっと読み込む
                </Button>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
