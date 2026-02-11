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
  ShieldAlert,
  UserCheck,
  Milestone,
  Clock,
} from 'lucide-react';
import { useDashboardStats, useProjects, usePartners, useManagerDashboard } from '@/hooks';
import type { ProjectAtRisk, TeamWorkloadItem, UpcomingDeadline } from '@/services/dashboardService';
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
import { dashboardService, type ReportType, type ReportFormat } from '@/services/dashboardService';

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
  const { data: managerData, isLoading: isLoadingManager } = useManagerDashboard();

  // Report generation state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('weekly');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('csv');
  const [isGenerating, setIsGenerating] = useState(false);

  const isLoading = isLoadingStats || isLoadingProjects || isLoadingPartners || isLoadingManager;

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
  const projectsAtRisk: ProjectAtRisk[] = managerData?.projectsAtRisk || [];
  const teamWorkload: TeamWorkloadItem[] = managerData?.teamWorkload || [];
  const upcomingDeadlines: UpcomingDeadline[] = managerData?.upcomingDeadlines || [];

  const projectCompletionRate = stats?.totalProjects
    ? Math.round((stats.completedProjects / stats.totalProjects) * 100)
    : 0;

  const taskCompletionRate = stats?.totalTasks
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      // Call the backend API to generate and download the report
      await dashboardService.downloadReport({
        reportType,
        format: reportFormat,
      });

      const reportName = reportType === 'weekly' ? '週次' : reportType === 'monthly' ? '月次' : 'カスタム';
      addToast({
        type: 'success',
        title: 'レポートを生成しました',
        message: `${reportName}レポート（${reportFormat.toUpperCase()}形式）のダウンロードが開始されました`,
      });
      setShowReportModal(false);
    } catch (error) {
      console.error('Report generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'もう一度お試しください';
      addToast({
        type: 'error',
        title: 'レポート生成に失敗しました',
        message: errorMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
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
      <div className="grid-stats">
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

      {/* Section 1: 危険案件一覧 */}
      <Card>
        <CardHeader
          action={
            <Link
              to="/projects"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              案件一覧
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <span>危険案件一覧</span>
          </div>
        </CardHeader>
        <CardContent>
          {projectsAtRisk.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <CheckSquare className="mr-2 h-5 w-5 text-green-500" />
              <span>危険な案件はありません</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {projectsAtRisk.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {project.name}
                      </p>
                      <Badge
                        variant={
                          project.riskLevel === 'critical'
                            ? 'danger'
                            : project.riskLevel === 'high'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {project.riskLevel === 'critical'
                          ? '危険'
                          : project.riskLevel === 'high'
                          ? '高リスク'
                          : '注意'}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                      <span>進捗: {project.progress}%</span>
                      <span className={project.daysRemaining < 0 ? 'text-red-500 font-medium' : ''}>
                        {project.daysRemaining < 0
                          ? `${Math.abs(project.daysRemaining)}日超過`
                          : `残り ${project.daysRemaining} 日`}
                      </span>
                      {project.overdueTaskCount > 0 && (
                        <span className="text-red-500">
                          期限超過タスク: {project.overdueTaskCount}件
                        </span>
                      )}
                    </div>
                    {project.riskReasons.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {project.riskReasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center"
                      style={{
                        background: `conic-gradient(${
                          project.progress < 30 ? '#ef4444' : project.progress < 60 ? '#f59e0b' : '#22c55e'
                        } ${project.progress * 3.6}deg, #e5e7eb ${project.progress * 3.6}deg)`,
                      }}
                    >
                      <div className="h-7 w-7 rounded-full bg-white flex items-center justify-center">
                        <span className="text-xs font-bold">{project.progress}%</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: 担当者別負荷 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-500" />
            <span>担当者別負荷</span>
          </div>
        </CardHeader>
        <CardContent>
          {teamWorkload.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Users className="mr-2 h-5 w-5 text-gray-400" />
              <span>チームメンバーがいません</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">担当者</th>
                    <th className="pb-3 font-medium text-center">全タスク</th>
                    <th className="pb-3 font-medium text-center">完了</th>
                    <th className="pb-3 font-medium text-center">進行中</th>
                    <th className="pb-3 font-medium text-center">期限超過</th>
                    <th className="pb-3 font-medium" style={{ minWidth: '120px' }}>進捗</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teamWorkload.map((member) => {
                    const completionRate = member.totalTasks > 0
                      ? Math.round((member.completedTasks / member.totalTasks) * 100)
                      : 0;
                    return (
                      <tr key={member.userId} className="hover:bg-gray-50">
                        <td className="py-3">
                          <span className="font-medium text-gray-900">{member.userName}</span>
                        </td>
                        <td className="py-3 text-center text-gray-700">{member.totalTasks}</td>
                        <td className="py-3 text-center text-green-600">{member.completedTasks}</td>
                        <td className="py-3 text-center text-blue-600">{member.inProgressTasks}</td>
                        <td className="py-3 text-center">
                          {member.overdueTasks > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              {member.overdueTasks}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-gray-200">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  completionRate >= 80
                                    ? 'bg-green-500'
                                    : completionRate >= 50
                                    ? 'bg-blue-500'
                                    : completionRate >= 25
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{completionRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: 今週のマイルストーン */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Milestone className="h-5 w-5 text-amber-500" />
            <span>今週のマイルストーン</span>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingDeadlines.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Calendar className="mr-2 h-5 w-5 text-gray-400" />
              <span>今週のマイルストーンはありません</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {upcomingDeadlines.map((deadline) => (
                <Link
                  key={deadline.id}
                  to={`/projects/${deadline.projectId}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {deadline.title}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                      {deadline.projectName && (
                        <span className="truncate">{deadline.projectName}</span>
                      )}
                      {deadline.assigneeName && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {deadline.assigneeName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-3 flex-shrink-0">
                    <Badge
                      variant={
                        deadline.status === 'in_progress'
                          ? 'primary'
                          : deadline.status === 'todo'
                          ? 'default'
                          : deadline.status === 'review'
                          ? 'warning'
                          : deadline.status === 'waiting'
                          ? 'danger'
                          : 'default'
                      }
                    >
                      {deadline.status === 'in_progress'
                        ? '進行中'
                        : deadline.status === 'todo'
                        ? '未着手'
                        : deadline.status === 'review'
                        ? 'レビュー中'
                        : deadline.status === 'waiting'
                        ? '待機中'
                        : deadline.status}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className={deadline.daysRemaining <= 1 ? 'font-medium text-red-600' : 'text-gray-600'}>
                        {deadline.daysRemaining <= 0
                          ? '今日'
                          : deadline.daysRemaining === 1
                          ? '明日'
                          : `${deadline.daysRemaining}日後`}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
            <div className="grid-cards">
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
            onChange={(e) => setReportType(e.target.value as ReportType)}
            options={[
              { value: 'weekly', label: '週次レポート' },
              { value: 'monthly', label: '月次レポート' },
              { value: 'custom', label: 'カスタム期間' },
            ]}
          />

          <Select
            label="出力形式"
            value={reportFormat}
            onChange={(e) => setReportFormat(e.target.value as ReportFormat)}
            options={[
              { value: 'pdf', label: 'PDF（未実装）', disabled: true },
              { value: 'excel', label: 'Excel（未実装）', disabled: true },
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
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                開発中
              </span>
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
