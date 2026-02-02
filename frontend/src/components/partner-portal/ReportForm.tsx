import {
  AlertTriangle,
  Smile,
  XCircle,
  Send,
  PartyPopper,
} from 'lucide-react';
import { Button, Card, Alert } from '@/components/common';
import { ReportFormInfo } from '@/types';
import { ProgressStatus } from './types';

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

export function ReportForm({
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
        「順調」「完了」はワンクリックで報告できます。「やや遅れ」「問題あり」の場合は詳細を入力できます。
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
