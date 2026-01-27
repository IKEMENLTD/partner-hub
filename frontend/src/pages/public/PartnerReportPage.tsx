import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send, CheckCircle, AlertCircle, Clock, List, Smile, AlertTriangle, XCircle } from 'lucide-react';
import { Button, Card, Loading, Alert } from '@/components/common';
import { ReportFormInfo } from '@/types';
import { api, ApiError } from '@/services/api';

type ProgressStatus = 'on_track' | 'slightly_delayed' | 'has_issues';

interface ReportHistoryItem {
  id: string;
  reportType: string;
  progressStatus?: ProgressStatus;
  content: string;
  weeklyAccomplishments?: string;
  projectName?: string;
  createdAt: string;
}

interface ReportHistoryResponse {
  reports: ReportHistoryItem[];
}

interface QuickReportInput {
  projectId?: string;
  reportType: 'progress';
  progressStatus: ProgressStatus;
  weeklyAccomplishments?: string;
  nextWeekPlan?: string;
}

const progressStatusOptions: {
  value: ProgressStatus;
  label: string;
  icon: typeof Smile;
  color: 'green' | 'yellow' | 'red';
  description: string;
}[] = [
  {
    value: 'on_track',
    label: '順調',
    icon: Smile,
    color: 'green',
    description: '予定通り進んでいます'
  },
  {
    value: 'slightly_delayed',
    label: 'やや遅れ',
    icon: AlertTriangle,
    color: 'yellow',
    description: '少し遅れが出ています'
  },
  {
    value: 'has_issues',
    label: '問題あり',
    icon: XCircle,
    color: 'red',
    description: '対応が必要な問題があります'
  },
];

export function PartnerReportPage() {
  const { token } = useParams<{ token: string }>();
  const [formInfo, setFormInfo] = useState<ReportFormInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);

  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [progressStatus, setProgressStatus] = useState<ProgressStatus | null>(null);
  const [weeklyAccomplishments, setWeeklyAccomplishments] = useState('');
  const [nextWeekPlan, setNextWeekPlan] = useState('');

  useEffect(() => {
    if (token) {
      fetchFormInfo();
    }
  }, [token]);

  const fetchFormInfo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<ReportFormInfo>(`/report/${token}`, true);
      setFormInfo(response);

      if (response.projects?.length === 1) {
        setSelectedProjectId(response.projects[0].id);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('このリンクは無効または期限切れです。管理者にお問い合わせください。');
        } else if (err.status === 404) {
          setError('報告用リンクが見つかりません。URLを確認してください。');
        } else {
          setError(err.message || 'エラーが発生しました。しばらく経ってから再度お試しください。');
        }
      } else {
        setError('エラーが発生しました。しばらく経ってから再度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReportHistory = async () => {
    try {
      const response = await api.get<ReportHistoryResponse>(`/report/${token}/history`, true);
      setReportHistory(response.reports || []);
      setShowHistory(true);
    } catch (err) {
      console.error('Failed to fetch report history:', err);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!progressStatus) {
      setError('進捗状況を選択してください');
      return;
    }

    // 順調以外は実施内容が必須
    if (progressStatus !== 'on_track' && !weeklyAccomplishments.trim()) {
      setError('「やや遅れ」「問題あり」の場合は、今週の実施内容を入力してください');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const reportData: QuickReportInput = {
        projectId: selectedProjectId || undefined,
        reportType: 'progress',
        progressStatus,
        weeklyAccomplishments: weeklyAccomplishments.trim() || undefined,
        nextWeekPlan: nextWeekPlan.trim() || undefined,
      };

      await api.post(`/report/${token}`, reportData, true);
      setSubmitSuccess(true);
      // Reset form
      setProgressStatus(null);
      setWeeklyAccomplishments('');
      setNextWeekPlan('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '報告の送信に失敗しました。再度お試しください。');
      } else {
        setError('報告の送信に失敗しました。再度お試しください。');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // クイック送信（順調ボタンをクリックしてそのまま送信）
  const handleQuickSubmit = async (status: ProgressStatus) => {
    setProgressStatus(status);

    // 順調の場合は即座に送信可能
    if (status === 'on_track') {
      setIsSubmitting(true);
      setError(null);

      try {
        const reportData: QuickReportInput = {
          projectId: selectedProjectId || undefined,
          reportType: 'progress',
          progressStatus: status,
        };

        await api.post(`/report/${token}`, reportData, true);
        setSubmitSuccess(true);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message || '報告の送信に失敗しました。再度お試しください。');
        } else {
          setError('報告の送信に失敗しました。再度お試しください。');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getStatusLabel = (status: ProgressStatus) => {
    return progressStatusOptions.find(o => o.value === status)?.label || status;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (error && !formInfo) {
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

  if (submitSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">報告を送信しました</h1>
          <p className="text-gray-600 mb-6">
            報告が正常に送信されました。担当者が確認次第、必要に応じてご連絡いたします。
          </p>
          <Button
            variant="primary"
            onClick={() => setSubmitSuccess(false)}
          >
            続けて報告する
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Partner Hub</h1>
              <p className="text-sm text-gray-500">進捗報告フォーム</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchReportHistory}
            >
              <List className="h-4 w-4 mr-1" />
              報告履歴
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Partner Info */}
        <Card className="mb-6 p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-xl font-semibold text-primary-600">
                {formInfo?.partner?.name?.charAt(0) || '?'}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{formInfo?.partner?.name || 'パートナー'} 様</p>
              {formInfo?.partner?.companyName && (
                <p className="text-sm text-gray-500">{formInfo.partner.companyName}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Quick Report Form */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            現在の進捗状況を教えてください
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            「順調」の場合はワンクリックで報告完了できます
          </p>

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                      onClick={() => handleQuickSubmit(option.value)}
                      disabled={isSubmitting}
                      className={`relative p-6 rounded-xl border-2 transition-all ${colorClasses[option.color]} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Icon className={`h-10 w-10 mx-auto mb-3 ${
                        option.color === 'green' ? 'text-green-500' :
                        option.color === 'yellow' ? 'text-yellow-500' :
                        'text-red-500'
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

            {/* Additional fields for non-on_track status */}
            {progressStatus && progressStatus !== 'on_track' && (
              <>
                {/* Weekly Accomplishments */}
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
                  <p className="mt-1 text-sm text-gray-500">
                    {weeklyAccomplishments.length}/5000文字
                  </p>
                </div>

                {/* Next Week Plan */}
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

                {/* Submit Button */}
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

        {/* Token Info */}
        {formInfo?.tokenInfo?.expiresAt && (
          <p className="mt-4 text-sm text-gray-500 text-center">
            <Clock className="inline-block h-4 w-4 mr-1" />
            このリンクの有効期限: {new Date(formInfo.tokenInfo.expiresAt).toLocaleDateString('ja-JP')}
          </p>
        )}
      </main>

      {/* Report History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">報告履歴</h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                >
                  閉じる
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              {reportHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">報告履歴がありません</p>
              ) : (
                <div className="space-y-4">
                  {reportHistory.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        {report.progressStatus ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            report.progressStatus === 'on_track' ? 'bg-green-100 text-green-800' :
                            report.progressStatus === 'slightly_delayed' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {getStatusLabel(report.progressStatus)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {report.reportType}
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          {new Date(report.createdAt).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      {report.projectName && (
                        <p className="text-sm text-gray-600 mb-2">案件: {report.projectName}</p>
                      )}
                      <p className="text-sm text-gray-700">
                        {report.weeklyAccomplishments || report.content || '（詳細なし）'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
