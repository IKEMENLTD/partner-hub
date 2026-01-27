import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send, CheckCircle, AlertCircle, FileText, Clock, List } from 'lucide-react';
import { Button, Card, Loading, Alert } from '@/components/common';
import { ReportFormInfo, ReportInput, ReportType } from '@/types';
import { api, ApiError } from '@/services/api';

interface ReportHistoryItem {
  id: string;
  reportType: ReportType;
  content: string;
  projectName?: string;
  createdAt: string;
}

interface ReportHistoryResponse {
  reports: ReportHistoryItem[];
}

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
  const [reportType, setReportType] = useState<ReportType>('progress');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (token) {
      fetchFormInfo();
    }
  }, [token]);

  const fetchFormInfo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // skipAuth=true for public API
      const response = await api.get<ReportFormInfo>(`/report/${token}`, true);
      setFormInfo(response);

      // Set default project if only one available
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('報告内容を入力してください');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const reportData: ReportInput = {
        projectId: selectedProjectId || undefined,
        reportType,
        content: content.trim(),
      };

      await api.post(`/report/${token}`, reportData, true);
      setSubmitSuccess(true);
      setContent('');
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

  const reportTypeOptions = [
    { value: 'progress', label: '進捗報告' },
    { value: 'issue', label: '課題・問題報告' },
    { value: 'completion', label: '完了報告' },
    { value: 'general', label: 'その他' },
  ];

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
              <p className="text-sm text-gray-500">パートナー報告フォーム</p>
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

        {/* Report Form */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            <FileText className="inline-block h-5 w-5 mr-2 text-gray-500" />
            報告を作成
          </h2>

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Selection */}
            {formInfo?.projects && formInfo.projects.length > 0 && (
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

            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                報告種別 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {reportTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setReportType(option.value as ReportType)}
                    className={`px-4 py-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                      reportType === option.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                報告内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder={
                  reportType === 'progress'
                    ? '進捗状況をお知らせください。\n例：デザイン作業が50%完了しました。来週中に初稿を提出予定です。'
                    : reportType === 'issue'
                    ? '課題や問題点をお知らせください。\n例：仕様の一部で確認が必要な点があります。'
                    : reportType === 'completion'
                    ? '完了した内容をお知らせください。\n例：指定された作業が完了しました。成果物は添付ファイルをご確認ください。'
                    : 'ご報告内容を入力してください。'
                }
              />
              <p className="mt-2 text-sm text-gray-500">
                {content.length}/10000文字
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                disabled={!content.trim()}
              >
                <Send className="h-5 w-5 mr-2" />
                報告を送信
              </Button>
            </div>
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.reportType === 'progress' ? 'bg-blue-100 text-blue-800' :
                          report.reportType === 'issue' ? 'bg-red-100 text-red-800' :
                          report.reportType === 'completion' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {reportTypeOptions.find(o => o.value === report.reportType)?.label || report.reportType}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(report.createdAt).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      {report.projectName && (
                        <p className="text-sm text-gray-600 mb-2">案件: {report.projectName}</p>
                      )}
                      <p className="text-sm text-gray-700">{report.content}</p>
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
