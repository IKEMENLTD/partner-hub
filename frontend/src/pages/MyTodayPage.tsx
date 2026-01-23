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
  Eye,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { getUserDisplayName } from '@/types';
import type { TaskStatus } from '@/types';
import { useTodayStats, useUpdateTaskStatus } from '@/hooks';
import { useRecentProjects } from '@/hooks/useRecentProjects';
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
import { TaskCard } from '@/components/dashboard';

export function MyTodayPage() {
  const { user } = useAuthStore();
  const { data, isLoading, error, refetch } = useTodayStats();

  // Fetch recent projects from localStorage
  const { projects: recentProjects, isLoading: isLoadingProjects } = useRecentProjects();

  // Task status update with optimistic updates
  const { mutate: updateTaskStatus } = useUpdateTaskStatus();

  const handleTaskStatusChange = (taskId: string, status: TaskStatus) => {
    updateTaskStatus({ id: taskId, status });
  };

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

  const tasksForToday = Array.isArray(todayStats?.tasksForToday) ? todayStats.tasksForToday : [];
  const upcomingDeadlines = Array.isArray(todayStats?.upcomingDeadlines) ? todayStats.upcomingDeadlines : [];
  const upcomingProjectDeadlines = Array.isArray(todayStats?.upcomingProjectDeadlines) ? todayStats.upcomingProjectDeadlines : [];

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

  // Waiting tasks (tasks assigned to others that user is stakeholder of)
  // These are tasks from upcoming deadlines that are not assigned to current user
  // but the user may be monitoring/stakeholder of these tasks
  const waitingForOthersTasks = upcomingDeadlines.filter(
    (t) => t.assigneeId && t.assigneeId !== user?.id && t.status !== 'completed'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getUserDisplayName(user)
              ? `おはようございます、${getUserDisplayName(user)}さん`
              : 'おはようございます'}
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
            <p className="text-sm text-gray-500">本日期限のタスク</p>
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

      {/* Recent Projects Section (below Quick Stats) */}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {recentProjects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex flex-col p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="rounded-lg bg-primary-100 p-2">
                      <FolderKanban className="h-4 w-4 text-primary-600" />
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
                  </div>
                  <p className="font-medium text-gray-900 text-sm line-clamp-2">
                    {project.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    更新: {format(new Date(project.updatedAt || project.startDate), 'M/d', { locale: ja })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content - Today's Tasks and Upcoming Deadlines */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's Tasks */}
        <Card padding="none">
          <CardHeader className="px-6 pt-6">
            本日期限のタスク
            {tasksForToday.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({tasksForToday.length}件)
              </span>
            )}
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {tasksForToday.length === 0 ? (
              <EmptyState
                title="本日期限のタスクはありません"
                description="新しいタスクを追加するか、今後の期限を確認してください"
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {tasksForToday.map((task) => (
                  <TaskCard key={task.id} task={task} compact onStatusChange={handleTaskStatusChange} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Project Deadlines */}
        <Card padding="none">
          <CardHeader className="px-6 pt-6">
            期限が1週間以内の案件
            {upcomingProjectDeadlines.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({upcomingProjectDeadlines.length}件)
              </span>
            )}
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {upcomingProjectDeadlines.length === 0 ? (
              <EmptyState
                title="期限が1週間以内の案件はありません"
                description="1週間以内に期限を迎える案件がここに表示されます"
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {upcomingProjectDeadlines.map((project) => {
                  const endDate = project.endDate ? new Date(project.endDate) : null;
                  const isOverdue = endDate && endDate < today;
                  const isToday = endDate && endDate.toDateString() === today.toDateString();
                  return (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary-100 p-2">
                          <FolderKanban className="h-4 w-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{project.name}</p>
                          <p className="text-xs text-gray-500">
                            期限: {endDate ? format(endDate, 'M月d日', { locale: ja }) : '未設定'}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={isOverdue ? 'danger' : isToday ? 'warning' : 'default'}
                      >
                        {isOverdue
                          ? '期限超過'
                          : isToday
                          ? '本日期限'
                          : endDate
                          ? format(endDate, 'M/d', { locale: ja })
                          : '未設定'}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Action Tasks (Self) */}
        <Card padding="none">
          <CardHeader className="px-6 pt-6">
            <div className="flex items-center gap-2">
              <Hourglass className="h-5 w-5 text-orange-500" />
              <span>自分の対応待ち</span>
            </div>
            {pendingActionTasks.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({pendingActionTasks.length}件)
              </span>
            )}
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
                  <TaskCard key={task.id} task={task} compact onStatusChange={handleTaskStatusChange} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Waiting for Others (Tasks assigned to others that I'm stakeholder of) */}
        <Card padding="none">
          <CardHeader className="px-6 pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              <span>対応待ち（他者）</span>
            </div>
            {waitingForOthersTasks.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({waitingForOthersTasks.length}件)
              </span>
            )}
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {waitingForOthersTasks.length === 0 ? (
              <EmptyState
                title="他者待ちのタスクはありません"
                description="他のメンバーに割り当てられたタスクがここに表示されます"
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {waitingForOthersTasks.slice(0, 5).map((task) => (
                  <TaskCard key={task.id} task={task} compact onStatusChange={handleTaskStatusChange} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
