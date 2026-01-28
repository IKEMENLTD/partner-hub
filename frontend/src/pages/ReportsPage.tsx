import { useState } from 'react';
import {
  FileText,
  Plus,
  Settings,
  Calendar,
  Clock,
  Mail,
  Play,
  Pause,
  Trash2,
  Eye,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Loading,
  EmptyState,
  Tabs,
  TabList,
  Pagination,
} from '@/components/common';
import { ReportConfigForm, ReportViewer } from '@/components/reports';
import {
  useReportConfigs,
  useGeneratedReports,
  useCreateReportConfig,
  useUpdateReportConfig,
  useDeleteReportConfig,
  useGenerateReport,
  useTriggerScheduledReports,
  getPeriodLabel,
  getStatusLabel,
  getStatusColor,
  getDayOfWeekLabel,
} from '@/hooks';
import { useToast } from '@/components/common/Toast';
import type {
  ReportConfig,
  GeneratedReport,
  ReportConfigInput,
} from '@/services/reportService';

const tabs = [
  { id: 'reports', label: '生成されたレポート', icon: <FileText className="h-4 w-4" /> },
  { id: 'configs', label: 'レポート設定', icon: <Settings className="h-4 w-4" /> },
];

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState('reports');
  const [configPage, setConfigPage] = useState(1);
  const [reportPage, setReportPage] = useState(1);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ReportConfig | null>(null);
  const [viewingReport, setViewingReport] = useState<GeneratedReport | null>(null);
  const { addToast } = useToast();

  // Queries
  const {
    data: configsData,
    isLoading: configsLoading,
    refetch: refetchConfigs,
  } = useReportConfigs({ page: configPage, limit: 10 });

  const {
    data: reportsData,
    isLoading: reportsLoading,
    refetch: refetchReports,
  } = useGeneratedReports({ page: reportPage, limit: 10 });

  // Mutations
  const createConfig = useCreateReportConfig();
  const updateConfig = useUpdateReportConfig();
  const deleteConfig = useDeleteReportConfig();
  const generateReport = useGenerateReport();
  const triggerScheduled = useTriggerScheduledReports();

  const handleCreateConfig = async (data: ReportConfigInput) => {
    try {
      await createConfig.mutateAsync(data);
      addToast({ title: 'レポート設定を作成しました', type: 'success' });
      setShowConfigForm(false);
    } catch (error: any) {
      addToast({ title: error.message || 'エラーが発生しました', type: 'error' });
    }
  };

  const handleUpdateConfig = async (data: ReportConfigInput) => {
    if (!editingConfig) return;
    try {
      await updateConfig.mutateAsync({ id: editingConfig.id, data });
      addToast({ title: 'レポート設定を更新しました', type: 'success' });
      setEditingConfig(null);
      setShowConfigForm(false);
    } catch (error: any) {
      addToast({ title: error.message || 'エラーが発生しました', type: 'error' });
    }
  };

  const handleToggleStatus = async (config: ReportConfig) => {
    const newStatus = config.status === 'active' ? 'paused' : 'active';
    try {
      await updateConfig.mutateAsync({
        id: config.id,
        data: { status: newStatus },
      });
      addToast({
        title: newStatus === 'active' ? 'レポートを有効化しました' : 'レポートを一時停止しました',
        type: 'success',
      });
    } catch (error: any) {
      addToast({ title: error.message || 'エラーが発生しました', type: 'error' });
    }
  };

  const handleDeleteConfig = async (config: ReportConfig) => {
    if (!confirm(`「${config.name}」を削除しますか？`)) return;
    try {
      await deleteConfig.mutateAsync(config.id);
      addToast({ title: 'レポート設定を削除しました', type: 'success' });
    } catch (error: any) {
      addToast({ title: error.message || 'エラーが発生しました', type: 'error' });
    }
  };

  const handleGenerateNow = async (configId?: string) => {
    try {
      await generateReport.mutateAsync({
        period: 'weekly',
        reportConfigId: configId,
      });
      addToast({ title: 'レポートを生成しました', type: 'success' });
      setActiveTab('reports');
    } catch (error: any) {
      addToast({ title: error.message || 'エラーが発生しました', type: 'error' });
    }
  };

  const handleTriggerScheduled = async () => {
    try {
      await triggerScheduled.mutateAsync();
      addToast({ title: 'スケジュール済みレポートの処理を開始しました', type: 'success' });
    } catch (error: any) {
      addToast({ title: error.message || 'エラーが発生しました', type: 'error' });
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNextRun = (dateStr?: string): string => {
    if (!dateStr) return '未設定';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays}日${diffHours}時間後`;
    } else if (diffHours > 0) {
      return `${diffHours}時間後`;
    } else {
      return 'まもなく';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            自動レポート
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            定期的な進捗レポートを自動生成・送信
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => handleGenerateNow()}
            disabled={generateReport.isPending}
          >
            <Zap className="h-4 w-4 mr-2" />
            {generateReport.isPending ? '生成中...' : '今すぐ生成'}
          </Button>
          <Button onClick={() => setShowConfigForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新規設定
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs activeTab={activeTab} onTabChange={setActiveTab}>
        <TabList tabs={tabs} />
      </Tabs>

      {/* Generated Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              生成されたレポート
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetchReports()}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              更新
            </Button>
          </div>

          {reportsLoading ? (
            <Loading />
          ) : reportsData && reportsData.data.length > 0 ? (
            <>
              <div className="space-y-3">
                {reportsData.data.map((report) => (
                  <Card key={report.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-primary-600 shrink-0" />
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {report.title}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <Badge className={getStatusColor(report.status)}>
                            {getStatusLabel(report.status)}
                          </Badge>
                          <Badge variant="default">{getPeriodLabel(report.period)}</Badge>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {report.dateRangeStart} 〜 {report.dateRangeEnd}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDate(report.createdAt)}
                          </span>
                        </div>
                        {report.sentTo && report.sentTo.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <Mail className="h-4 w-4" />
                            <span>{report.sentTo.length}名に送信済み</span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setViewingReport(report)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        詳細
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
              {reportsData.totalPages > 1 && (
                <Pagination
                  currentPage={reportPage}
                  totalPages={reportsData.totalPages}
                  onPageChange={setReportPage}
                />
              )}
            </>
          ) : (
            <EmptyState
              title="レポートがありません"
              description="「今すぐ生成」ボタンでレポートを作成するか、スケジュール設定を追加してください"
              icon={<FileText className="h-12 w-12" />}
            />
          )}
        </div>
      )}

      {/* Report Configs Tab */}
      {activeTab === 'configs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              レポート設定
            </h2>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTriggerScheduled}
                disabled={triggerScheduled.isPending}
              >
                <Play className="h-4 w-4 mr-1" />
                スケジュール実行
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => refetchConfigs()}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                更新
              </Button>
            </div>
          </div>

          {configsLoading ? (
            <Loading />
          ) : configsData && configsData.data.length > 0 ? (
            <>
              <div className="space-y-3">
                {configsData.data.map((config) => (
                  <Card key={config.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Settings className="h-5 w-5 text-primary-600 shrink-0" />
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {config.name}
                          </h3>
                          <Badge className={getStatusColor(config.status)}>
                            {getStatusLabel(config.status)}
                          </Badge>
                        </div>
                        {config.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {config.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <Badge variant="default">{getPeriodLabel(config.period)}</Badge>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {config.period === 'weekly'
                              ? `毎週${getDayOfWeekLabel(config.dayOfWeek)}曜日`
                              : `毎月${config.dayOfMonth}日`}
                            {' '}
                            {config.sendTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {config.recipients.length}名
                          </span>
                          {config.status === 'active' && config.nextRunAt && (
                            <span className="flex items-center gap-1 text-primary-600">
                              <Clock className="h-4 w-4" />
                              次回: {formatNextRun(config.nextRunAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleGenerateNow(config.id)}
                          disabled={generateReport.isPending}
                          title="今すぐ生成"
                        >
                          <Zap className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleStatus(config)}
                          title={config.status === 'active' ? '一時停止' : '有効化'}
                        >
                          {config.status === 'active' ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingConfig(config);
                            setShowConfigForm(true);
                          }}
                          title="編集"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDeleteConfig(config)}
                          title="削除"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {configsData.totalPages > 1 && (
                <Pagination
                  currentPage={configPage}
                  totalPages={configsData.totalPages}
                  onPageChange={setConfigPage}
                />
              )}
            </>
          ) : (
            <EmptyState
              title="レポート設定がありません"
              description="「新規設定」ボタンで定期レポートの送信設定を追加してください"
              icon={<Settings className="h-12 w-12" />}
              action={
                <Button onClick={() => setShowConfigForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  新規設定を追加
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* Config Form Modal */}
      <ReportConfigForm
        isOpen={showConfigForm}
        onClose={() => {
          setShowConfigForm(false);
          setEditingConfig(null);
        }}
        onSubmit={editingConfig ? handleUpdateConfig : handleCreateConfig}
        initialData={editingConfig || undefined}
        isLoading={createConfig.isPending || updateConfig.isPending}
      />

      {/* Report Viewer Modal */}
      <ReportViewer
        isOpen={!!viewingReport}
        onClose={() => setViewingReport(null)}
        report={viewingReport}
      />
    </div>
  );
}
