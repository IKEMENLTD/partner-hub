import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  CheckSquare,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Smile,
  XCircle,
  Calendar,
  BarChart3,
  Send,
} from 'lucide-react';
import { Button, Card, Loading, Badge } from '@/components/common';
import { api, ApiError } from '@/services/api';

interface PartnerInfo {
  id: string;
  name: string;
  email: string;
  companyName?: string;
}

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

interface TaskSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  projectName?: string;
}

interface ReportSummary {
  id: string;
  reportType: string;
  progressStatus?: string;
  projectName?: string;
  createdAt: string;
}

interface DashboardData {
  partner: PartnerInfo;
  tokenInfo: {
    expiresAt: string;
    projectRestriction: boolean;
  };
  stats: {
    projects: number;
    tasks: {
      total: number;
      completed: number;
      inProgress: number;
      todo: number;
      overdue: number;
    };
    reportsThisMonth: number;
  };
  projects: ProjectSummary[];
  upcomingTasks: TaskSummary[];
  recentReports: ReportSummary[];
}

const statusLabels: Record<string, string> = {
  planning: '計画中',
  in_progress: '進行中',
  review: 'レビュー中',
  completed: '完了',
  on_hold: '保留',
};

const taskStatusLabels: Record<string, string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー中',
  done: '完了',
};

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '緊急',
};

const progressStatusLabels: Record<string, { label: string; color: string }> = {
  on_track: { label: '順調', color: 'green' },
  slightly_delayed: { label: 'やや遅れ', color: 'yellow' },
  has_issues: { label: '問題あり', color: 'red' },
};

export function PartnerDashboardPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        success?: boolean;
        data?: DashboardData;
      } & DashboardData>(`/report/${token}/dashboard`, true);
      const data = response.data || response;
      setDashboardData(data as DashboardData);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('このリンクは無効または期限切れです。管理者にお問い合わせください。');
        } else if (err.status === 404) {
          setError('ダッシュボードが見つかりません。URLを確認してください。');
        } else {
          setError(err.message || 'エラーが発生しました。');
        }
      } else {
        setError('エラーが発生しました。しばらく経ってから再度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const goToReportForm = () => {
    navigate(`/report/${token}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">アクセスエラー</h1>
          <p className="text-gray-600">{error || 'データの取得に失敗しました。'}</p>
        </Card>
      </div>
    );
  }

  const { partner, stats, projects, upcomingTasks, recentReports, tokenInfo } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Partner Hub</h1>
              <p className="text-sm text-gray-500">マイダッシュボード</p>
            </div>
            <Button variant="primary" onClick={goToReportForm}>
              <Send className="h-4 w-4 mr-2" />
              進捗報告
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Card */}
        <Card className="mb-6 p-6 bg-gradient-to-r from-primary-50 to-primary-100">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 h-14 w-14 rounded-full bg-primary-600 flex items-center justify-center">
              <span className="text-2xl font-semibold text-white">
                {partner.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">
                ようこそ、{partner.name} 様
              </p>
              {partner.companyName && (
                <p className="text-sm text-gray-600">{partner.companyName}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FolderKanban className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">担当案件</p>
                <p className="text-2xl font-bold text-gray-900">{stats.projects}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">タスク</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.tasks.completed}/{stats.tasks.total}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">今月の報告</p>
                <p className="text-2xl font-bold text-gray-900">{stats.reportsThisMonth}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.tasks.overdue > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`h-5 w-5 ${stats.tasks.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">期限超過</p>
                <p className={`text-2xl font-bold ${stats.tasks.overdue > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {stats.tasks.overdue}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Projects */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">担当案件</h2>
              <FolderKanban className="h-5 w-5 text-gray-400" />
            </div>
            {projects.length === 0 ? (
              <p className="text-gray-500 text-center py-8">担当案件はありません</p>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="p-4 rounded-lg border border-gray-200 hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                        )}
                        {(project.startDate || project.endDate) && (
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {project.startDate && new Date(project.startDate).toLocaleDateString('ja-JP')}
                            {project.startDate && project.endDate && ' 〜 '}
                            {project.endDate && new Date(project.endDate).toLocaleDateString('ja-JP')}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          project.status === 'completed' ? 'success' :
                          project.status === 'in_progress' ? 'primary' :
                          project.status === 'on_hold' ? 'warning' : 'default'
                        }
                      >
                        {statusLabels[project.status] || project.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming Tasks */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">今週のタスク</h2>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            {upcomingTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">今週のタスクはありません</p>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                        {task.projectName && (
                          <p className="text-sm text-gray-500">{task.projectName}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={
                            task.status === 'done' ? 'success' :
                            task.status === 'in_progress' ? 'primary' : 'default'
                          }
                          size="sm"
                        >
                          {taskStatusLabels[task.status] || task.status}
                        </Badge>
                        {task.dueDate && (
                          <span className="text-xs text-gray-500">
                            {new Date(task.dueDate).toLocaleDateString('ja-JP')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Reports */}
        <Card className="mt-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">最近の報告</h2>
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
          {recentReports.length === 0 ? (
            <p className="text-gray-500 text-center py-8">報告履歴はありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-sm font-medium text-gray-500 py-3 pr-4">日時</th>
                    <th className="text-left text-sm font-medium text-gray-500 py-3 pr-4">種別</th>
                    <th className="text-left text-sm font-medium text-gray-500 py-3 pr-4">ステータス</th>
                    <th className="text-left text-sm font-medium text-gray-500 py-3">案件</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((report) => (
                    <tr key={report.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 pr-4 text-sm text-gray-600">
                        {new Date(report.createdAt).toLocaleString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={report.reportType === 'completion' ? 'success' : 'default'} size="sm">
                          {report.reportType === 'progress' ? '進捗' :
                           report.reportType === 'completion' ? '完了' :
                           report.reportType === 'issue' ? '課題' : 'その他'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {report.progressStatus ? (
                          <span className={`inline-flex items-center gap-1 text-sm ${
                            report.progressStatus === 'on_track' ? 'text-green-600' :
                            report.progressStatus === 'slightly_delayed' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {report.progressStatus === 'on_track' ? (
                              <Smile className="h-4 w-4" />
                            ) : report.progressStatus === 'slightly_delayed' ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            {progressStatusLabels[report.progressStatus]?.label || report.progressStatus}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {report.projectName || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Token Expiry Info */}
        {tokenInfo.expiresAt && (
          <p className="mt-6 text-sm text-gray-500 text-center">
            <Clock className="inline-block h-4 w-4 mr-1" />
            このリンクの有効期限: {new Date(tokenInfo.expiresAt).toLocaleDateString('ja-JP')}
          </p>
        )}
      </main>
    </div>
  );
}
