import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  MessageSquare,
  Eye,
  Check,
  Filter,
  Smile,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  EmptyState,
  Loading,
  Button,
} from '@/components/common';
import { api } from '@/services/api';
import { getProgressStatusLabel } from '@/hooks/usePartnerReports';

interface PartnerReport {
  id: string;
  partnerId: string;
  projectId: string | null;
  reportType: string;
  progressStatus: 'on_track' | 'slightly_delayed' | 'has_issues' | null;
  content: string | null;
  weeklyAccomplishments: string | null;
  nextWeekPlan: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  partner: {
    id: string;
    name: string;
    email: string;
    companyName: string | null;
  };
  project: {
    id: string;
    name: string;
  } | null;
}

interface PaginatedReportsResponse {
  data: PartnerReport[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

function unwrapResponse<T>(response: T | ApiResponse<T>): T {
  if (response && typeof response === 'object' && 'data' in response && 'success' in response) {
    return (response as ApiResponse<T>).data;
  }
  return response as T;
}

export function PartnerReportsListPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch reports
  const { data: reportsResponse, isLoading } = useQuery({
    queryKey: ['partnerReports', 'list', filter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (filter === 'unread') {
        params.append('unreadOnly', 'true');
      }
      const response = await api.get<PaginatedReportsResponse | ApiResponse<PaginatedReportsResponse>>(`/partner-reports?${params.toString()}`);
      console.log('Reports list response:', response);
      return unwrapResponse<PaginatedReportsResponse>(response);
    },
  });

  // Mark as read mutation
  const { mutate: markAsRead } = useMutation({
    mutationFn: async (reportId: string) => {
      await api.patch(`/partner-reports/${reportId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerReports'] });
    },
  });

  // Mark all as read mutation
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMutation({
    mutationFn: async () => {
      const reports = reportsResponse?.data.filter((r) => !r.isRead) || [];
      const ids = reports.map((r) => r.id);
      if (ids.length > 0) {
        await api.post('/partner-reports/mark-read', { ids });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerReports'] });
    },
  });

  const reports = reportsResponse?.data || [];
  const meta = reportsResponse?.meta;
  const totalPages = meta?.totalPages || 1;
  const unreadCount = reports.filter((r) => !r.isRead).length;

  const handleMarkAsRead = (reportId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markAsRead(reportId);
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'on_track':
        return <Smile className="h-4 w-4 text-green-500" />;
      case 'slightly_delayed':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'has_issues':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (
    status: string | null
  ): 'success' | 'warning' | 'danger' | 'default' => {
    switch (status) {
      case 'on_track':
        return 'success';
      case 'slightly_delayed':
        return 'warning';
      case 'has_issues':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getReportTypeLabel = (type: string): string => {
    switch (type) {
      case 'progress':
        return '進捗報告';
      case 'completion':
        return '完了報告';
      case 'issue':
        return '問題報告';
      case 'general':
        return '一般報告';
      default:
        return type;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">パートナーからの報告</h1>
        <p className="text-gray-600 mt-1">
          パートナーから受信した報告を確認できます
        </p>
      </div>

      <Card>
        <CardHeader
          action={
            <div className="flex items-center gap-4">
              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value as 'all' | 'unread');
                    setPage(1);
                  }}
                  className="text-sm border-gray-300 rounded-md"
                >
                  <option value="all">すべて</option>
                  <option value="unread">未読のみ</option>
                </select>
              </div>

              {/* Mark all as read */}
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsRead()}
                  disabled={isMarkingAll}
                >
                  <Check className="h-4 w-4 mr-1" />
                  すべて既読にする
                </Button>
              )}
            </div>
          }
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary-500" />
            <span>報告一覧</span>
            {meta && (
              <span className="text-sm text-gray-500">
                ({meta.total}件)
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loading size="lg" />
            </div>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-12 w-12" />}
              title={filter === 'unread' ? '未読の報告はありません' : '報告はありません'}
              description="パートナーからの報告がここに表示されます"
              className="py-12"
            />
          ) : (
            <>
              <div className="space-y-4">
                {reports.map((report) => (
                  <Link
                    key={report.id}
                    to={`/partners/${report.partnerId}`}
                    className={`block p-4 border rounded-lg hover:border-primary-300 transition-colors ${
                      report.isRead
                        ? 'border-gray-200 bg-white'
                        : 'border-primary-200 bg-primary-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header Row */}
                        <div className="flex items-center gap-3 mb-2">
                          {!report.isRead && (
                            <span className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full" />
                          )}
                          <span className="font-medium text-gray-900 truncate">
                            {report.partner.name}
                          </span>
                          {report.partner.companyName && (
                            <span className="text-sm text-gray-500">
                              ({report.partner.companyName})
                            </span>
                          )}
                          {report.progressStatus && (
                            <Badge variant={getStatusBadgeVariant(report.progressStatus)}>
                              {getStatusIcon(report.progressStatus)}
                              <span className="ml-1">
                                {getProgressStatusLabel(report.progressStatus)}
                              </span>
                            </Badge>
                          )}
                          <Badge variant="default">
                            {getReportTypeLabel(report.reportType)}
                          </Badge>
                        </div>

                        {/* Project */}
                        {report.project && (
                          <p className="text-sm text-gray-500 mb-2">
                            案件: {report.project.name}
                          </p>
                        )}

                        {/* Content Preview */}
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {report.weeklyAccomplishments || report.content || '（内容なし）'}
                        </p>

                        {/* Time */}
                        <p className="text-xs text-gray-400 mt-2">
                          {format(new Date(report.createdAt), 'yyyy年M月d日 HH:mm', {
                            locale: ja,
                          })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {!report.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(report.id, e)}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="既読にする"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 text-gray-600 hover:text-primary-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm text-gray-600">
                    {page} / {totalPages} ページ
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 text-gray-600 hover:text-primary-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
