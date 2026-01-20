import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Users,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  Building,
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
} from '@/components/common';
import { ProjectCard } from '@/components/project';

export function ManagerDashboardPage() {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">マネージャーダッシュボード</h1>
        <p className="mt-1 text-gray-600">
          チームの進捗状況とKPIを確認できます
        </p>
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
    </div>
  );
}
