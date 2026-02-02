import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertCircle,
  Smile,
  Clock,
  Send,
  LayoutDashboard,
} from 'lucide-react';
import { Button, Card, Loading } from '@/components/common';
import { ReportFormInfo } from '@/types';
import { api, ApiError } from '@/services/api';
import {
  DashboardData,
  ProgressStatus,
  TabType,
  DashboardContent,
  ReportForm,
} from '@/components/partner-portal';

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

  const fetchData = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

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
