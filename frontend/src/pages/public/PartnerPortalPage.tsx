import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FolderKanban,
  CheckSquare,
  FileText,
  Clock,
  AlertTriangle,
  AlertCircle,
  Smile,
  XCircle,
  Calendar,
  Send,
  LayoutDashboard,
  PartyPopper,
} from 'lucide-react';
import { Button, Card, Loading, Badge, Alert } from '@/components/common';
import { ReportFormInfo } from '@/types';
import { api, ApiError } from '@/services/api';

// Types
type ProgressStatus = 'on_track' | 'slightly_delayed' | 'has_issues';
type TabType = 'dashboard' | 'report';

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
  content?: string;
  weeklyAccomplishments?: string;
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

// Labels
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

const progressStatusLabels: Record<string, { label: string; color: string }> = {
  on_track: { label: '順調', color: 'green' },
  slightly_delayed: { label: 'やや遅れ', color: 'yellow' },
  has_issues: { label: '問題あり', color: 'red' },
};

const progressStatusOptions: {
  value: ProgressStatus;
  label: string;
  icon: typeof Smile;
  color: 'green' | 'yellow' | 'red';
  description: string;
}[] = [
  { value: 'on_track', label: '順調', icon: Smile, color: 'green', description: '予定通り進んでいます' },
  { value: 'slightly_delayed', label: 'やや遅れ', icon: AlertTriangle, color: 'yellow', description: '少し遅れが出ています' },
  { value: 'has_issues', label: '問題あり', icon: XCircle, color: 'red', description: '対応が必要な問題があります' },
];

export function PartnerPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Shared state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [formInfo, setFormInfo] = useState<ReportFormInfo | null>(null);

  // Report form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [progressStatus, setProgressStatus] = useState<ProgressStatus | null>(null);
  const [weeklyAccomplishments, setWeeklyAccomplishments] = useState('');
  const [nextWeekPlan, setNextWeekPlan] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch both dashboard and form info in parallel
      const [dashboardResponse, formResponse] = await Promise.all([
        api.get<{ success?: boolean; data?: DashboardData } & DashboardData>(`/report/${token}/dashboard`, true).catch(() => null),
        api.get<{ success?: boolean; data?: ReportFormInfo } & ReportFormInfo>(`/report/${token}`, true),
      ]);

      // Handle form response
      const formData = formResponse.data || formResponse;
      setFormInfo(formData as ReportFormInfo);

      if (formData.projects?.length === 1) {
        setSelectedProjectId(formData.projects[0].id);
      }

      // Handle dashboard response
      if (dashboardResponse) {
        const data = dashboardResponse.data || dashboardResponse;
        setDashboardData(data as DashboardData);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('このリンクは無効または期限切れです。管理者にお問い合わせください。');
        } else if (err.status === 404) {
          setError('ページが見つかりません。URLを確認してください。');
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!progressStatus) {
      setFormError('進捗状況を選択してください');
      return;
    }

    if (progressStatus !== 'on_track' && !weeklyAccomplishments.trim()) {
      setFormError('「やや遅れ」「問題あり」の場合は、今週の実施内容を入力してください');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await api.post(`/report/${token}`, {
        projectId: selectedProjectId || undefined,
        reportType: 'progress',
        progressStatus,
        weeklyAccomplishments: weeklyAccomplishments.trim() || undefined,
        nextWeekPlan: nextWeekPlan.trim() || undefined,
      }, true);

      setSubmitSuccess(true);
      setProgressStatus(null);
      setWeeklyAccomplishments('');
      setNextWeekPlan('');

      // Refresh dashboard data
      fetchData();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message || '報告の送信に失敗しました。');
      } else {
        setFormError('報告の送信に失敗しました。再度お試しください。');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSubmit = async (status: ProgressStatus) => {
    setProgressStatus(status);

    if (status === 'on_track') {
      setIsSubmitting(true);
      setFormError(null);

      try {
        await api.post(`/report/${token}`, {
          projectId: selectedProjectId || undefined,
          reportType: 'progress',
          progressStatus: status,
        }, true);

        setSubmitSuccess(true);
        fetchData();
      } catch (err) {
        if (err instanceof ApiError) {
          setFormError(err.message || '報告の送信に失敗しました。');
        } else {
          setFormError('報告の送信に失敗しました。再度お試しください。');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCompletionSubmit = async () => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      await api.post(`/report/${token}`, {
        projectId: selectedProjectId || undefined,
        reportType: 'completion',
        content: '作業が完了しました',
      }, true);

      setSubmitSuccess(true);
      fetchData();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message || '報告の送信に失敗しました。');
      } else {
        setFormError('報告の送信に失敗しました。再度お試しください。');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">アクセスエラー</h1>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    );
  }

  const partnerName = dashboardData?.partner?.name || formInfo?.partner?.name || 'パートナー';
  const companyName = dashboardData?.partner?.companyName || formInfo?.partner?.companyName;
  const tokenExpiry = dashboardData?.tokenInfo?.expiresAt || formInfo?.tokenInfo?.expiresAt;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Partner Hub</h1>
              <p className="text-sm text-gray-500">パートナーポータル</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
                <span className="text-lg font-semibold text-white">
                  {partnerName.charAt(0)}
                </span>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{partnerName} 様</p>
                {companyName && <p className="text-xs text-gray-500">{companyName}</p>}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => { setActiveTab('dashboard'); setSubmitSuccess(false); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              ダッシュボード
            </button>
            <button
              onClick={() => { setActiveTab('report'); setSubmitSuccess(false); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'report'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Send className="h-4 w-4" />
              進捗報告
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboardData && (
          <DashboardContent data={dashboardData} />
        )}
        {activeTab === 'dashboard' && !dashboardData && (
          <Card className="p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">ダッシュボードデータを取得できませんでした</p>
            <Button variant="secondary" className="mt-4" onClick={fetchData}>
              再読み込み
            </Button>
          </Card>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          submitSuccess ? (
            <Card className="p-8 text-center">
              <Smile className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">報告を送信しました</h2>
              <p className="text-gray-600 mb-6">
                報告が正常に送信されました。担当者が確認次第、必要に応じてご連絡いたします。
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="secondary" onClick={() => setActiveTab('dashboard')}>
                  ダッシュボードを見る
                </Button>
                <Button variant="primary" onClick={() => setSubmitSuccess(false)}>
                  続けて報告する
                </Button>
              </div>
            </Card>
          ) : (
            <ReportForm
              formInfo={formInfo}
              selectedProjectId={selectedProjectId}
              setSelectedProjectId={setSelectedProjectId}
              progressStatus={progressStatus}
              weeklyAccomplishments={weeklyAccomplishments}
              setWeeklyAccomplishments={setWeeklyAccomplishments}
              nextWeekPlan={nextWeekPlan}
              setNextWeekPlan={setNextWeekPlan}
              isSubmitting={isSubmitting}
              formError={formError}
              onSubmit={handleSubmit}
              onQuickSubmit={handleQuickSubmit}
              onCompletionSubmit={handleCompletionSubmit}
            />
          )
        )}

        {/* Token Expiry */}
        {tokenExpiry && (
          <p className="mt-8 text-sm text-gray-500 text-center">
            <Clock className="inline-block h-4 w-4 mr-1" />
            このリンクの有効期限: {new Date(tokenExpiry).toLocaleDateString('ja-JP')}
          </p>
        )}
      </main>
    </div>
  );
}

// Dashboard Content Component
function DashboardContent({ data }: { data: DashboardData }) {
  const { stats, projects, upcomingTasks, recentReports } = data;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <div key={project.id} className="p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
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

        {/* Tasks */}
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
                <div key={task.id} className="p-4 rounded-lg border border-gray-200">
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
      <Card className="p-6">
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
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
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
                          report.progressStatus === 'slightly_delayed' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {report.progressStatus === 'on_track' ? <Smile className="h-4 w-4" /> :
                           report.progressStatus === 'slightly_delayed' ? <AlertTriangle className="h-4 w-4" /> :
                           <XCircle className="h-4 w-4" />}
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
    </div>
  );
}

// Report Form Component
interface ReportFormProps {
  formInfo: ReportFormInfo | null;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  progressStatus: ProgressStatus | null;
  weeklyAccomplishments: string;
  setWeeklyAccomplishments: (val: string) => void;
  nextWeekPlan: string;
  setNextWeekPlan: (val: string) => void;
  isSubmitting: boolean;
  formError: string | null;
  onSubmit: (e?: React.FormEvent) => void;
  onQuickSubmit: (status: ProgressStatus) => void;
  onCompletionSubmit: () => void;
}

function ReportForm({
  formInfo,
  selectedProjectId,
  setSelectedProjectId,
  progressStatus,
  weeklyAccomplishments,
  setWeeklyAccomplishments,
  nextWeekPlan,
  setNextWeekPlan,
  isSubmitting,
  formError,
  onSubmit,
  onQuickSubmit,
  onCompletionSubmit,
}: ReportFormProps) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        現在の進捗状況を教えてください
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        「順調」の場合はワンクリックで報告完了できます
      </p>

      {formError && (
        <Alert variant="error" className="mb-6">
          {formError}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Project Selection */}
        {formInfo?.projects && formInfo.projects.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              対象案件
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">案件を選択（任意）</option>
              {formInfo.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Progress Status Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            進捗状況 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {progressStatusOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = progressStatus === option.value;
              const colorClasses = {
                green: isSelected
                  ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-500'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50',
                yellow: isSelected
                  ? 'border-yellow-500 bg-yellow-50 text-yellow-700 ring-2 ring-yellow-500'
                  : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50',
                red: isSelected
                  ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-500'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-50',
              };

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onQuickSubmit(option.value)}
                  disabled={isSubmitting}
                  className={`relative p-6 rounded-xl border-2 transition-all ${colorClasses[option.color]} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Icon className={`h-10 w-10 mx-auto mb-3 ${
                    option.color === 'green' ? 'text-green-500' :
                    option.color === 'yellow' ? 'text-yellow-500' : 'text-red-500'
                  }`} />
                  <p className="text-lg font-bold mb-1">{option.label}</p>
                  <p className="text-xs text-gray-500">{option.description}</p>
                  {option.value === 'on_track' && (
                    <span className="absolute top-2 right-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      ワンクリック
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Completion Button */}
        <div className="pt-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">または</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCompletionSubmit}
            disabled={isSubmitting}
            className={`mt-4 w-full relative p-6 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <PartyPopper className="h-10 w-10 mx-auto mb-3 text-blue-500" />
            <p className="text-lg font-bold mb-1 text-gray-900">完了</p>
            <p className="text-xs text-gray-500">作業が完了しました</p>
            <span className="absolute top-2 right-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              ワンクリック
            </span>
          </button>
        </div>

        {/* Additional fields for non-on_track status */}
        {progressStatus && progressStatus !== 'on_track' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                今週の実施内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={weeklyAccomplishments}
                onChange={(e) => setWeeklyAccomplishments(e.target.value)}
                rows={4}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="今週実施した作業内容を入力してください"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                来週の予定（任意）
              </label>
              <textarea
                value={nextWeekPlan}
                onChange={(e) => setNextWeekPlan(e.target.value)}
                rows={3}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="来週の予定があれば入力してください"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                disabled={!weeklyAccomplishments.trim()}
              >
                <Send className="h-5 w-5 mr-2" />
                報告を送信
              </Button>
            </div>
          </>
        )}
      </form>
    </Card>
  );
}
