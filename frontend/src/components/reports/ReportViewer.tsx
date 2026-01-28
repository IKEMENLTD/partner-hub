import { Mail, Calendar, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Modal, Badge, Card } from '@/components/common';
import type { GeneratedReport } from '@/services/reportService';
import { getPeriodLabel, getStatusLabel, getStatusColor } from '@/hooks/useReports';

interface ReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  report: GeneratedReport | null;
}

export function ReportViewer({ isOpen, onClose, report }: ReportViewerProps) {
  if (!report) return null;

  const { reportData } = report;

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={report.title} size="xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Header Info */}
        <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-gray-200 dark:border-slate-700">
          <Badge className={getStatusColor(report.status)}>
            {getStatusLabel(report.status)}
          </Badge>
          <Badge variant="default">{getPeriodLabel(report.period)}</Badge>
          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {reportData.dateRange.start} 〜 {reportData.dateRange.end}
          </span>
          {report.sentAt && (
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Mail className="h-4 w-4" />
              送信済み: {formatDate(report.sentAt)}
            </span>
          )}
        </div>

        {/* Project Summary */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-600" />
            案件サマリー
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="総案件数" value={reportData.projectSummary.total} />
            <StatCard
              label="進行中"
              value={reportData.projectSummary.active}
              color="blue"
            />
            <StatCard
              label="完了"
              value={reportData.projectSummary.completed}
              color="green"
            />
            <StatCard
              label="遅延"
              value={reportData.projectSummary.delayed}
              color={reportData.projectSummary.delayed > 0 ? 'red' : 'green'}
            />
          </div>
        </section>

        {/* Task Summary */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary-600" />
            タスクサマリー
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="総タスク数" value={reportData.taskSummary.total} />
            <StatCard
              label="完了"
              value={reportData.taskSummary.completed}
              color="green"
            />
            <StatCard
              label="進行中"
              value={reportData.taskSummary.inProgress}
              color="blue"
            />
            <StatCard
              label="期限超過"
              value={reportData.taskSummary.overdue}
              color={reportData.taskSummary.overdue > 0 ? 'red' : 'green'}
            />
            <StatCard
              label="完了率"
              value={`${reportData.taskSummary.completionRate}%`}
              color={
                reportData.taskSummary.completionRate >= 80
                  ? 'green'
                  : reportData.taskSummary.completionRate >= 50
                    ? 'yellow'
                    : 'red'
              }
            />
          </div>
        </section>

        {/* Partner Performance */}
        {reportData.partnerPerformance.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              パートナーパフォーマンス
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      パートナー名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      進行中案件
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      完了タスク
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      納期遵守率
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      評価
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                  {reportData.partnerPerformance.map((partner) => (
                    <tr key={partner.partnerId}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {partner.partnerName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {partner.activeProjects}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {partner.tasksCompleted}/{partner.tasksTotal}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span
                          className={`font-medium ${
                            partner.onTimeDeliveryRate >= 90
                              ? 'text-green-600'
                              : partner.onTimeDeliveryRate >= 70
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}
                        >
                          {partner.onTimeDeliveryRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {partner.rating.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Highlights */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary-600" />
            ハイライト
          </h3>
          <div className="space-y-4">
            {/* Key Achievements */}
            {reportData.highlights.keyAchievements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  主な成果
                </h4>
                <div className="space-y-2">
                  {reportData.highlights.keyAchievements.map((achievement, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                    >
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {achievement}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues */}
            {reportData.highlights.issues.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  注意事項
                </h4>
                <div className="space-y-2">
                  {reportData.highlights.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
                    >
                      <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {issue}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Deadlines */}
            {reportData.highlights.upcomingDeadlines.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  今後の期限
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          種類
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          名前
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          期限
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          残日数
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                      {reportData.highlights.upcomingDeadlines.map((deadline) => (
                        <tr key={`${deadline.type}-${deadline.id}`}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <Badge variant="default">
                              {deadline.type === 'project' ? '案件' : 'タスク'}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {deadline.name}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {deadline.dueDate}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            <span
                              className={`font-medium ${
                                deadline.daysRemaining <= 2
                                  ? 'text-red-600'
                                  : deadline.daysRemaining <= 5
                                    ? 'text-yellow-600'
                                    : 'text-gray-600'
                              }`}
                            >
                              {deadline.daysRemaining}日
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Health Score Stats */}
        {reportData.healthScoreStats && (
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              ヘルススコア統計
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                label="平均スコア"
                value={reportData.healthScoreStats.averageScore}
                color={
                  reportData.healthScoreStats.averageScore >= 80
                    ? 'green'
                    : reportData.healthScoreStats.averageScore >= 60
                      ? 'yellow'
                      : 'red'
                }
              />
              <StatCard
                label="リスク案件"
                value={reportData.healthScoreStats.projectsAtRisk}
                color={reportData.healthScoreStats.projectsAtRisk > 0 ? 'red' : 'green'}
              />
              <StatCard
                label="総案件数"
                value={reportData.healthScoreStats.totalProjects}
              />
            </div>
          </section>
        )}

        {/* Sent To */}
        {report.sentTo && report.sentTo.length > 0 && (
          <section className="pt-4 border-t border-gray-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              送信先
            </h4>
            <div className="flex flex-wrap gap-2">
              {report.sentTo.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                >
                  <Mail className="h-3 w-3" />
                  {email}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  color = 'default',
}: {
  label: string;
  value: string | number;
  color?: 'default' | 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    default: 'text-gray-900 dark:text-white',
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card className="p-4 text-center">
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </Card>
  );
}
