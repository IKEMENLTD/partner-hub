import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Plus,
  Briefcase,
  Users,
  FolderKanban,
  Hourglass,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { getUserDisplayName } from '@/types';
import { useTodayStats, useMarkAlertAsRead, useMarkAllAlertsAsRead, useProjects } from '@/hooks';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  PageLoading,
  ErrorMessage,
  EmptyState,
  Badge,
} from '@/components/common';
import { TaskCard, AlertList } from '@/components/dashboard';

export function MyTodayPage() {
  const { user } = useAuthStore();
  const { data, isLoading, error, refetch } = useTodayStats();
  const { mutate: markAsRead } = useMarkAlertAsRead();
  const { mutate: markAllAsRead } = useMarkAllAlertsAsRead();

  // Fetch recent projects
  const { data: recentProjectsData, isLoading: isLoadingProjects } = useProjects({
    page: 1,
    pageSize: 5,
    sortField: 'updatedAt',
    sortOrder: 'desc',
  });

  const recentProjects = recentProjectsData?.data || [];

  if (isLoading || isLoadingProjects) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="データの読み込みに失敗しました"
        retry={() => refetch()}
      />
    );
  }

  const todayStats = data;
  const today = new Date();

  const tasksForToday = todayStats?.tasksForToday || [];
  const upcomingDeadlines = todayStats?.upcomingDeadlines || [];
  const recentAlerts = todayStats?.recentAlerts || [];

  const completedTodayCount = tasksForToday.filter(
    (t) => t.status === 'completed'
  ).length;
  const pendingTodayCount = tasksForToday.filter(
    (t) => t.status !== 'completed'
  ).length;
  const overdueCount = upcomingDeadlines.filter(
    (t) => t.dueDate && new Date(t.dueDate) < today && t.status !== 'completed'
  ).length;

  // Pending action tasks (tasks waiting for user's action)
  const pendingActionTasks = tasksForToday.filter(
    (t) => t.status === 'todo' || t.status === 'in_review'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            おはようございます、{getUserDisplayName(user)}さん
          </h1>
          <p className="mt-1 text-gray-600">
            {format(today, 'yyyy年M月d日 (EEEE)', { locale: ja })}
          </p>
        </div>
        <Button
          as={Link}
          to="/projects/new"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          新規案件
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-primary-100 p-3">
            <Calendar className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">今日のタスク</p>
            <p className="text-2xl font-bold text-gray-900">{tasksForToday.length}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-green-100 p-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">完了済み</p>
            <p className="text-2xl font-bold text-gray-900">{completedTodayCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-orange-100 p-3">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">残りタスク</p>
            <p className="text-2xl font-bold text-gray-900">{pendingTodayCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-red-100 p-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">期限超過</p>
            <p className="text-2xl font-bold text-gray-900">{overdueCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-blue-100 p-3">
            <Briefcase className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">案件数</p>
            <p className="text-2xl font-bold text-gray-900">{todayStats?.totalProjects ?? 0}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-purple-100 p-3">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">パートナー数</p>
            <p className="text-2xl font-bold text-gray-900">{todayStats?.totalPartners ?? 0}</p>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="none">
            <CardHeader
              className="px-6 pt-6"
              action={
                <Link
                  to="/today"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  すべて表示
                  <ArrowRight className="h-4 w-4" />
                </Link>
              }
            >
              今日のタスク
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {tasksForToday.length === 0 ? (
                <EmptyState
                  title="今日のタスクはありません"
                  description="新しいタスクを追加するか、明日の予定を確認してください"
                  className="py-8"
                />
              ) : (
                <div className="space-y-3">
                  {tasksForToday.map((task) => (
                    <TaskCard key={task.id} task={task} compact />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card padding="none">
            <CardHeader
              className="px-6 pt-6"
              action={
                <Link
                  to="/today"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  すべて表示
                  <ArrowRight className="h-4 w-4" />
                </Link>
              }
            >
              今後の期限
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {upcomingDeadlines.length === 0 ? (
                <EmptyState
                  title="今後の期限はありません"
                  description="期限が設定されたタスクがここに表示されます"
                  className="py-8"
                />
              ) : (
                <div className="space-y-3">
                  {upcomingDeadlines.slice(0, 5).map((task) => (
                    <TaskCard key={task.id} task={task} compact />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alerts Sidebar */}
        <div>
          <Card padding="none">
            <CardHeader className="px-6 pt-6">アラート</CardHeader>
            <CardContent className="px-6 pb-6">
              <AlertList
                alerts={recentAlerts}
                onMarkAsRead={(id) => markAsRead(id)}
                onMarkAllAsRead={() => markAllAsRead()}
                showMarkAll
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Action Tasks */}
        <Card padding="none">
          <CardHeader
            className="px-6 pt-6"
            action={
              pendingActionTasks.length > 0 && (
                <Badge variant="warning">{pendingActionTasks.length}</Badge>
              )
            }
          >
            <div className="flex items-center gap-2">
              <Hourglass className="h-5 w-5 text-orange-500" />
              <span>対応待ち</span>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {pendingActionTasks.length === 0 ? (
              <EmptyState
                title="対応待ちのタスクはありません"
                description="すべてのタスクが処理済みです"
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {pendingActionTasks.slice(0, 5).map((task) => (
                  <TaskCard key={task.id} task={task} compact />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card padding="none">
          <CardHeader
            className="px-6 pt-6"
            action={
              <Link
                to="/projects"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                すべて表示
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary-500" />
              <span>最近使った案件</span>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {recentProjects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban className="h-10 w-10" />}
                title="最近の案件がありません"
                description="案件を作成または閲覧すると、ここに表示されます"
                className="py-8"
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary-100 p-2">
                        <FolderKanban className="h-4 w-4 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {project.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          更新: {format(new Date(project.updatedAt || project.startDate), 'M/d', { locale: ja })}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        project.status === 'completed'
                          ? 'success'
                          : project.status === 'in_progress'
                          ? 'primary'
                          : 'default'
                      }
                      className="text-xs"
                    >
                      {project.status === 'completed'
                        ? '完了'
                        : project.status === 'in_progress'
                        ? '進行中'
                        : project.status === 'planning'
                        ? '計画中'
                        : project.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
