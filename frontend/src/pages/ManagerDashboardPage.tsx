import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Users,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  Building,
  FileText,
  FileDown,
  Calendar,
  Settings,
} from 'lucide-react';
import { useDashboardStats, useProjects, usePartners } from '@/hooks';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  PageLoading,
  ErrorMessage,
  EmptyState,
  Modal,
  ModalFooter,
  Select,
  useToast,
} from '@/components/common';
import { ProjectCard } from '@/components/project';

export function ManagerDashboardPage() {
  const { addToast } = useToast();
  const { data: statsData, isLoading: isLoadingStats, error: statsError, refetch: refetchStats } = useDashboardStats();
  const { data: projectsData, isLoading: isLoadingProjects } = useProjects({
    page: 1,
    pageSize: 6,
    sortField: 'updatedAt',
    sortOrder: 'desc',
  });
  const { data: partnersData, isLoading: isLoadingPartners } = usePartners({
    page: 1,
    pageSize: 5,
  });

  // Report generation state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('weekly');
  const [reportFormat, setReportFormat] = useState('pdf');
  const [isGenerating, setIsGenerating] = useState(false);

  const isLoading = isLoadingStats || isLoadingProjects || isLoadingPartners;

  if (isLoading) {
    return <PageLoading />;
  }

  if (statsError) {
    return (
      <ErrorMessage
        message="ダッシュボードの読み込みに失敗しました"
        retry={() => refetchStats()}
      />
    );
  }

  const stats = statsData;
  const projects = projectsData?.data || [];
  const partners = partnersData?.data || [];

  const projectCompletionRate = stats?.totalProjects
    ? Math.round((stats.completedProjects / stats.totalProjects) * 100)
    : 0;

  const taskCompletionRate = stats?.totalTasks
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      // Simulate report generation API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // In real implementation, this would call the backend API
      // const response = await api.post('/reports/generate', { type: reportType, format: reportFormat });
      // window.open(response.data.downloadUrl, '_blank');
      const reportName = reportType === 'weekly' ? '週次' : reportType === 'monthly' ? '月次' : 'カスタム';
      addToast({
        type: 'success',
        title: 'レポートを生成しました',
        message: `${reportName}レポート（${reportFormat.toUpperCase()}形式）のダウンロードが開始されます`,
      });
      setShowReportModal(false);
    } catch (error) {
      console.error('Report generation failed:', error);
      addToast({
        type: 'error',
        title: 'レポート生成に失敗しました',
        message: 'もう一度お試しください',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">マネージャーダッシュボード</h1>
          <p className="mt-1 text-gray-600">
            チームの進捗状況とKPIを確認できます
          </p>
        </div>
        <Button
          leftIcon={<FileText className="h-4 w-4" />}
          onClick={() => setShowReportModal(true)}
        >
          レポート生成
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary-100 p-3">
              <FolderKanban className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">案件数</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalProjects || 0}
                </p>
                <span className="text-xs text-green-600">
                  {stats?.activeProjects || 0} 進行中
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-blue-100 p-3">
              <CheckSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">タスク数</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalTasks || 0}
                </p>
                <span className="text-xs text-gray-500">
                  {stats?.completedTasks || 0} 完了
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-green-100 p-3">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">パートナー</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalPartners || 0}
                </p>
                <span className="text-xs text-green-600">
                  {stats?.activePartners || 0} アクティブ
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-red-100 p-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">期限超過タスク</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.overdueTasks || 0}
                </p>
                {stats?.overdueTasks && stats.overdueTasks > 0 && (
                  <span className="text-xs text-red-600">要対応</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Project Progress */}
        <Card>
          <CardHeader
            action={
              <Link
                to="/projects"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                詳細
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            案件進捗
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">完了率</span>
              <span className="text-2xl font-bold text-gray-900">
                {projectCompletionRate}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-200">
              <div
                className="h-3 rounded-full bg-primary-500 transition-all"
                style={{ width: `${projectCompletionRate}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xl font-bold text-primary-600">
                  {stats?.activeProjects || 0}
                </p>
                <p className="text-xs text-gray-500">進行中</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xl font-bold text-green-600">
                  {stats?.completedProjects || 0}
                </p>
                <p className="text-xs text-gray-500">完了</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xl font-bold text-gray-600">
                  {stats?.totalProjects || 0}
                </p>
                <p className="text-xs text-gray-500">全体</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Progress */}
        <Card>
          <CardHeader
            action={
              <Link
                to="/today"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                詳細
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            タスク進捗
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">完了率</span>
              <span className="text-2xl font-bold text-gray-900">
                {taskCompletionRate}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-200">
              <div
                className="h-3 rounded-full bg-blue-500 transition-all"
                style={{ width: `${taskCompletionRate}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xl font-bold text-blue-600">
                  {stats?.pendingTasks || 0}
                </p>
                <p className="text-xs text-gray-500">未完了</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xl font-bold text-green-600">
                  {stats?.completedTasks || 0}
                </p>
                <p className="text-xs text-gray-500">完了</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-xl font-bold text-red-600">
                  {stats?.overdueTasks || 0}
                </p>
                <p className="text-xs text-gray-500">期限超過</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader
          action={
            <Button
              variant="outline"
              size="sm"
              as={Link}
              to="/projects"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              すべて表示
            </Button>
          }
        >
          最近の案件
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <EmptyState
              icon={<FolderKanban className="h-10 w-10" />}
              title="案件がありません"
              description="新しい案件を作成してください"
              action={
                <Button as={Link} to="/projects/new" size="sm">
                  新規案件を作成
                </Button>
              }
              className="py-8"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partners */}
      <Card>
        <CardHeader
          action={
            <Button
              variant="outline"
              size="sm"
              as={Link}
              to="/partners"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              すべて表示
            </Button>
          }
        >
          パートナー一覧
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <EmptyState
              icon={<Building className="h-10 w-10" />}
              title="パートナーがいません"
              description="パートナーを登録してください"
              action={
                <Button as={Link} to="/partners/new" size="sm">
                  新規パートナーを登録
                </Button>
              }
              className="py-8"
            />
          ) : (
            <div className="divide-y divide-gray-200">
              {partners.map((partner) => (
                <Link
                  key={partner.id}
                  to={`/partners/${partner.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gray-100 p-2">
                      <Building className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {partner.name}
                      </p>
                      {partner.companyName && (
                        <p className="text-sm text-gray-500">
                          {partner.companyName}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      partner.status === 'active'
                        ? 'success'
                        : partner.status === 'pending'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {partner.status === 'active'
                      ? 'アクティブ'
                      : partner.status === 'pending'
                      ? '申請中'
                      : partner.status === 'inactive'
                      ? '非アクティブ'
                      : '停止中'}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Generation Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="レポート生成"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            レポートの種類と形式を選択して、ダウンロードしてください。
          </p>

          <Select
            label="レポート種類"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={[
              { value: 'weekly', label: '週次レポート' },
              { value: 'monthly', label: '月次レポート' },
              { value: 'custom', label: 'カスタム期間' },
            ]}
          />

          <Select
            label="出力形式"
            value={reportFormat}
            onChange={(e) => setReportFormat(e.target.value)}
            options={[
              { value: 'pdf', label: 'PDF' },
              { value: 'excel', label: 'Excel' },
              { value: 'csv', label: 'CSV' },
            ]}
          />

          {/* 定期配信設定への導線 */}
          <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-100 p-2">
                <Calendar className="h-5 w-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">
                  定期配信を設定
                </h4>
                <p className="text-xs text-gray-600">
                  レポートを自動生成してメールで配信できます
                </p>
              </div>
              <Link
                to="/settings/reports"
                className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <Settings className="h-4 w-4" />
                設定
              </Link>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              レポート内容
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-green-500" />
                案件進捗サマリー
              </li>
              <li className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-green-500" />
                タスク完了率
              </li>
              <li className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-green-500" />
                パートナー稼働状況
              </li>
              <li className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-green-500" />
                期限超過タスク一覧
              </li>
            </ul>
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowReportModal(false)}>
            キャンセル
          </Button>
          <Button
            leftIcon={<FileDown className="h-4 w-4" />}
            onClick={handleGenerateReport}
            isLoading={isGenerating}
          >
            {isGenerating ? '生成中...' : 'ダウンロード'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
