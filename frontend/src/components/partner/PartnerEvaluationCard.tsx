import { useState, useMemo } from 'react';
import {
  Star,
  TrendingUp,
  Clock,
  FileText,
  Target,
  MessageSquare,
  Package,
  Zap,
  Shield,
  ChevronDown,
  ChevronUp,
  Plus,
  Calendar,
  User,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Modal, ModalFooter } from '@/components/common/Modal';
import { Loading } from '@/components/common/Loading';
import { Badge } from '@/components/common/Badge';
import {
  usePartnerEvaluationSummary,
  usePartnerEvaluationHistory,
  useCreatePartnerEvaluation,
} from '@/hooks';
import type {
  PartnerEvaluationInput,
  PartnerAutoMetrics,
  ManualEvaluationSummary,
} from '@/types';

interface PartnerEvaluationCardProps {
  partnerId: string;
}

// Star Rating Component
function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
}: {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= value
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// Progress Bar Component
function ProgressBar({
  value,
  max = 100,
  color = 'primary',
  showLabel = true,
}: {
  value: number;
  max?: number;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  return (
    <div className="w-full">
      <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {value.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

// Auto Metrics Section
function AutoMetricsSection({ metrics }: { metrics: PartnerAutoMetrics }) {
  const getProgressColor = (value: number): 'success' | 'warning' | 'danger' => {
    if (value >= 80) return 'success';
    if (value >= 50) return 'warning';
    return 'danger';
  };

  const getResponseTimeColor = (days: number): 'success' | 'warning' | 'danger' => {
    if (days <= 1) return 'success';
    if (days <= 3) return 'warning';
    return 'danger';
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        自動計算指標
      </h4>

      {/* Deadline Compliance Rate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Target className="h-4 w-4" />
            <span>期限遵守率</span>
          </div>
          <span className="text-sm font-medium">
            {metrics.completedOnTime}/{metrics.totalTasks} タスク
          </span>
        </div>
        <ProgressBar
          value={metrics.deadlineComplianceRate}
          color={getProgressColor(metrics.deadlineComplianceRate)}
        />
      </div>

      {/* Report Submission Rate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FileText className="h-4 w-4" />
            <span>報告提出率</span>
          </div>
          <span className="text-sm font-medium">
            {metrics.totalReportsSubmitted}/{metrics.totalReportsRequested} 報告
          </span>
        </div>
        <ProgressBar
          value={metrics.reportSubmissionRate}
          color={getProgressColor(metrics.reportSubmissionRate)}
        />
      </div>

      {/* Average Response Time */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>平均レスポンス時間</span>
          </div>
          <Badge variant={getResponseTimeColor(metrics.averageResponseTime) === 'success' ? 'success' : getResponseTimeColor(metrics.averageResponseTime) === 'warning' ? 'warning' : 'danger'}>
            {metrics.averageResponseTime.toFixed(1)} 日
          </Badge>
        </div>
      </div>
    </div>
  );
}

// Manual Evaluation Section
function ManualEvaluationSection({
  evaluation,
}: {
  evaluation: ManualEvaluationSummary;
}) {
  const evaluationItems = [
    {
      label: 'コミュニケーション',
      value: evaluation.communication,
      icon: MessageSquare,
    },
    {
      label: '成果物品質',
      value: evaluation.deliverableQuality,
      icon: Package,
    },
    { label: '対応速度', value: evaluation.responseSpeed, icon: Zap },
    { label: '信頼性', value: evaluation.reliability, icon: Shield },
  ];

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <Star className="h-4 w-4" />
        手動評価 (平均: {evaluation.averageManualScore.toFixed(1)})
      </h4>

      <div className="space-y-3">
        {evaluationItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </div>
            <StarRating value={Math.round(item.value)} readonly size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Evaluation Form Modal
function EvaluationFormModal({
  isOpen,
  onClose,
  partnerId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string;
  onSuccess?: () => void;
}) {
  const [formData, setFormData] = useState<PartnerEvaluationInput>({
    communication: 3,
    deliverableQuality: 3,
    responseSpeed: 3,
    reliability: 3,
    comment: '',
    evaluationPeriodStart: '',
    evaluationPeriodEnd: '',
  });

  const createEvaluation = useCreatePartnerEvaluation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        comment: formData.comment || undefined,
        evaluationPeriodStart: formData.evaluationPeriodStart || undefined,
        evaluationPeriodEnd: formData.evaluationPeriodEnd || undefined,
      };
      await createEvaluation.mutateAsync({
        partnerId,
        data: submitData,
      });
      onSuccess?.();
      onClose();
      setFormData({
        communication: 3,
        deliverableQuality: 3,
        responseSpeed: 3,
        reliability: 3,
        comment: '',
        evaluationPeriodStart: '',
        evaluationPeriodEnd: '',
      });
    } catch (error) {
      console.error('Failed to create evaluation:', error);
    }
  };

  const evaluationFields = [
    { key: 'communication' as const, label: 'コミュニケーション', icon: MessageSquare },
    { key: 'deliverableQuality' as const, label: '成果物品質', icon: Package },
    { key: 'responseSpeed' as const, label: '対応速度', icon: Zap },
    { key: 'reliability' as const, label: '信頼性', icon: Shield },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="パートナー評価を追加" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Rating Fields */}
          <div className="space-y-4">
            {evaluationFields.map((field) => (
              <div key={field.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <field.icon className="h-4 w-4" />
                  <span>{field.label}</span>
                </div>
                <StarRating
                  value={formData[field.key]}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, [field.key]: value }))
                  }
                />
              </div>
            ))}
          </div>

          {/* Evaluation Period */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                評価期間開始
              </label>
              <input
                type="date"
                value={formData.evaluationPeriodStart || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    evaluationPeriodStart: e.target.value,
                  }))
                }
                className="w-full min-w-0 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                評価期間終了
              </label>
              <input
                type="date"
                value={formData.evaluationPeriodEnd || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    evaluationPeriodEnd: e.target.value,
                  }))
                }
                className="w-full min-w-0 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm min-h-[44px]"
              />
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              コメント
            </label>
            <textarea
              value={formData.comment || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, comment: e.target.value }))
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="評価コメントを入力..."
            />
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createEvaluation.isPending}
          >
            評価を追加
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// Evaluation History Timeline
function EvaluationHistoryTimeline({
  partnerId,
}: {
  partnerId: string;
}) {
  const { data: history, isLoading } = usePartnerEvaluationHistory(partnerId);

  if (isLoading) {
    return <Loading size="sm" />;
  }

  if (!history || history.data.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        評価履歴がありません
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {history.data.map((evaluation) => (
        <div
          key={evaluation.id}
          className="relative pl-6 pb-4 border-l-2 border-gray-200 dark:border-slate-700 last:border-l-0"
        >
          <div className="absolute left-[-5px] top-0 h-2 w-2 rounded-full bg-primary-500" />
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(evaluation.createdAt).toLocaleDateString('ja-JP')}
                </span>
              </div>
              {evaluation.evaluator && (
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <User className="h-3 w-3" />
                  <span>
                    {evaluation.evaluator.lastName} {evaluation.evaluator.firstName}
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">コミュニケーション</span>
                <StarRating value={evaluation.communication} readonly size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">成果物品質</span>
                <StarRating value={evaluation.deliverableQuality} readonly size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">対応速度</span>
                <StarRating value={evaluation.responseSpeed} readonly size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">信頼性</span>
                <StarRating value={evaluation.reliability} readonly size="sm" />
              </div>
            </div>
            {evaluation.comment && (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 rounded p-2">
                {evaluation.comment}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Main Component
export function PartnerEvaluationCard({
  partnerId,
}: PartnerEvaluationCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);

  const { data: summary, isLoading, refetch } = usePartnerEvaluationSummary(partnerId);

  const overallScoreColor = useMemo(() => {
    if (!summary) return 'text-gray-400';
    if (summary.overallScore >= 4) return 'text-green-500';
    if (summary.overallScore >= 3) return 'text-yellow-500';
    return 'text-red-500';
  }, [summary]);

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Loading size="md" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent>
          <p className="text-center text-gray-500 dark:text-gray-400">
            評価データを読み込めませんでした
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader
          action={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setShowEvaluationModal(true)}
            >
              評価を追加
            </Button>
          }
        >
          パートナー評価
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="text-center py-4 border-b border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">総合評価</p>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-4xl font-bold ${overallScoreColor}`}>
                  {summary.overallScore.toFixed(1)}
                </span>
                <span className="text-lg text-gray-400">/5.0</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                (自動指標 40% + 手動評価 60%)
              </p>
              {summary.evaluationCount > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {summary.evaluationCount} 件の評価
                  {summary.lastEvaluationDate && (
                    <> | 最終評価: {new Date(summary.lastEvaluationDate).toLocaleDateString('ja-JP')}</>
                  )}
                </p>
              )}
            </div>

            {/* Auto Metrics */}
            <AutoMetricsSection metrics={summary.autoMetrics} />

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-slate-700" />

            {/* Manual Evaluation */}
            <ManualEvaluationSection evaluation={summary.manualEvaluation} />

            {/* History Toggle */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                <span>評価履歴</span>
                {showHistory ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showHistory && (
                <div className="mt-4">
                  <EvaluationHistoryTimeline partnerId={partnerId} />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evaluation Form Modal */}
      <EvaluationFormModal
        isOpen={showEvaluationModal}
        onClose={() => setShowEvaluationModal(false)}
        partnerId={partnerId}
        onSuccess={() => refetch()}
      />
    </>
  );
}
