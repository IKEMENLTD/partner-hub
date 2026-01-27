import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { MessageSquare, ArrowRight, Smile, AlertTriangle, XCircle, Eye } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, EmptyState, Loading } from '@/components/common';
import {
  useUnreadReports,
  useUnreadReportCount,
  useMarkReportAsRead,
  getProgressStatusLabel,
} from '@/hooks/usePartnerReports';

export function UnreadReportsWidget() {
  const { data: unreadReports, isLoading } = useUnreadReports(5);
  const { data: unreadCount } = useUnreadReportCount();
  const { mutate: markAsRead } = useMarkReportAsRead();

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

  const getStatusBadgeVariant = (status: string | null): 'success' | 'warning' | 'danger' | 'default' => {
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

  return (
    <Card padding="none">
      <CardHeader
        className="px-6 pt-6"
        action={
          <Link
            to="/partner-reports"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            すべて表示
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary-500" />
          <span>パートナーからの報告</span>
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loading size="md" />
          </div>
        ) : !unreadReports || unreadReports.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-10 w-10" />}
            title="未読の報告はありません"
            description="パートナーからの報告がここに表示されます"
            className="py-8"
          />
        ) : (
          <div className="space-y-3">
            {unreadReports.map((report) => (
              <Link
                key={report.id}
                to={`/partners/${report.partnerId}`}
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Partner & Status */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900 truncate">
                        {report.partner.name}
                      </span>
                      {report.progressStatus && (
                        <Badge variant={getStatusBadgeVariant(report.progressStatus)}>
                          {getStatusIcon(report.progressStatus)}
                          <span className="ml-1">{getProgressStatusLabel(report.progressStatus)}</span>
                        </Badge>
                      )}
                    </div>

                    {/* Project */}
                    {report.project && (
                      <p className="text-xs text-gray-500 mb-1">
                        案件: {report.project.name}
                      </p>
                    )}

                    {/* Content Preview */}
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {report.weeklyAccomplishments || report.content || '（内容なし）'}
                    </p>

                    {/* Time */}
                    <p className="text-xs text-gray-400 mt-2">
                      {format(new Date(report.createdAt), 'M月d日 HH:mm', { locale: ja })}
                    </p>
                  </div>

                  {/* Mark as read button */}
                  <button
                    onClick={(e) => handleMarkAsRead(report.id, e)}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="既読にする"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
