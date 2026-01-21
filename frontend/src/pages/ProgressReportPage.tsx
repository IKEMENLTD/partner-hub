import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Send,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Button, Input, TextArea, Card, Alert } from '@/components/common';
import { progressReportService } from '@/services/progressReportService';

interface FormData {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  projectName: string;
  dueDate: string | null;
  reporterName: string;
  reporterEmail: string;
  tokenExpiresAt: string;
}

interface ReportData {
  reporterName: string;
  progress: number;
  comment: string;
  attachmentUrls: string[];
}

type Step = 1 | 2 | 3;

export function ProgressReportPage() {
  const { token } = useParams<{ token: string }>();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [reportData, setReportData] = useState<ReportData>({
    reporterName: '',
    progress: 0,
    comment: '',
    attachmentUrls: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('無効なリンクです');
      setIsLoading(false);
      return;
    }

    loadFormData();
  }, [token]);

  const loadFormData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await progressReportService.getFormData(token!);
      setFormData({
        taskId: response.data.task.id,
        taskTitle: response.data.task.title,
        taskDescription: response.data.task.description || '',
        projectName: response.data.task.project?.name || 'Unknown Project',
        dueDate: response.data.task.dueDate,
        reporterName: response.data.reporterName,
        reporterEmail: response.data.reporterEmail,
        tokenExpiresAt: response.data.tokenExpiresAt,
      });
      setReportData((prev) => ({
        ...prev,
        reporterName: response.data.reporterName,
      }));
    } catch (err: any) {
      if (err.message?.includes('expired')) {
        setError('このリンクの有効期限が切れています。新しいリンクをリクエストしてください。');
      } else if (err.message?.includes('already')) {
        setError('この報告は既に送信されています。');
      } else {
        setError('フォームの読み込みに失敗しました。リンクが正しいか確認してください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!token) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await progressReportService.submitReport(token, {
        reporterName: reportData.reporterName,
        progress: reportData.progress,
        comment: reportData.comment || undefined,
        attachmentUrls: reportData.attachmentUrls.length > 0 ? reportData.attachmentUrls : undefined,
      });
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || '送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const isStep1Valid = reportData.reporterName.trim().length > 0;
  const isStep2Valid = reportData.progress >= 0 && reportData.progress <= 100;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !formData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            エラーが発生しました
          </h1>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            送信完了
          </h1>
          <p className="text-gray-600 mb-4">
            進捗報告が正常に送信されました。
            <br />
            ご協力ありがとうございます。
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-500 mb-1">報告内容</p>
            <p className="font-medium">進捗: {reportData.progress}%</p>
            {reportData.comment && (
              <p className="text-sm text-gray-600 mt-2">{reportData.comment}</p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">進捗報告フォーム</h1>
          <p className="mt-2 text-gray-600">
            {formData?.projectName} - {formData?.taskTitle}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                    currentStep >= step
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step}
                </div>
                {index < 2 && (
                  <div
                    className={`h-1 w-16 sm:w-24 ${
                      currentStep > step ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 px-2">
            <span className="text-xs text-gray-500">基本情報</span>
            <span className="text-xs text-gray-500">進捗入力</span>
            <span className="text-xs text-gray-500">確認・送信</span>
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Task Info Card */}
        <Card className="mb-6 p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">{formData?.taskTitle}</h3>
              {formData?.taskDescription && (
                <p className="text-sm text-blue-700 mt-1">{formData.taskDescription}</p>
              )}
              {formData?.dueDate && (
                <div className="flex items-center gap-1 mt-2 text-sm text-blue-600">
                  <Clock className="h-4 w-4" />
                  <span>期限: {new Date(formData.dueDate).toLocaleDateString('ja-JP')}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Form Card */}
        <Card className="p-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">基本情報</h2>
              <Input
                label="お名前"
                value={reportData.reporterName}
                onChange={(e) =>
                  setReportData((prev) => ({ ...prev, reporterName: e.target.value }))
                }
                placeholder="山田 太郎"
                required
              />
              <Input
                label="メールアドレス"
                value={formData?.reporterEmail || ''}
                disabled
                helperText="メールアドレスは変更できません"
              />
            </div>
          )}

          {/* Step 2: Progress */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">進捗状況</h2>

              {/* Progress Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  進捗率 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={reportData.progress}
                    onChange={(e) =>
                      setReportData((prev) => ({
                        ...prev,
                        progress: parseInt(e.target.value),
                      }))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={reportData.progress}
                      onChange={(e) => {
                        const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setReportData((prev) => ({ ...prev, progress: value }));
                      }}
                      className="w-16 px-2 py-1 text-center border border-gray-300 rounded-md text-sm"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
                {/* Progress bar visualization */}
                <div className="mt-4 h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 transition-all duration-300"
                    style={{ width: `${reportData.progress}%` }}
                  />
                </div>
              </div>

              {/* Comment */}
              <TextArea
                label="コメント"
                value={reportData.comment}
                onChange={(e) =>
                  setReportData((prev) => ({ ...prev, comment: e.target.value }))
                }
                placeholder="進捗状況の詳細、課題、次のステップなどを記入してください"
                rows={5}
                helperText="任意項目です"
              />
            </div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">確認・送信</h2>
              <p className="text-gray-600">
                以下の内容で進捗報告を送信します。内容をご確認ください。
              </p>

              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <p className="text-sm text-gray-500">報告者</p>
                  <p className="font-medium">{reportData.reporterName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">メールアドレス</p>
                  <p className="font-medium">{formData?.reporterEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">進捗率</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-600"
                        style={{ width: `${reportData.progress}%` }}
                      />
                    </div>
                    <span className="font-medium text-primary-600">
                      {reportData.progress}%
                    </span>
                  </div>
                </div>
                {reportData.comment && (
                  <div>
                    <p className="text-sm text-gray-500">コメント</p>
                    <p className="whitespace-pre-wrap">{reportData.comment}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                onClick={handleBack}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                戻る
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !isStep1Valid) ||
                  (currentStep === 2 && !isStep2Valid)
                }
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                次へ
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                isLoading={isSubmitting}
                leftIcon={<Send className="h-4 w-4" />}
              >
                送信する
              </Button>
            )}
          </div>
        </Card>

        {/* Token Expiry Warning */}
        {formData?.tokenExpiresAt && (
          <p className="mt-4 text-center text-sm text-gray-500">
            <Clock className="inline-block h-4 w-4 mr-1" />
            このリンクの有効期限:{' '}
            {new Date(formData.tokenExpiresAt).toLocaleString('ja-JP')}
          </p>
        )}
      </div>
    </div>
  );
}
