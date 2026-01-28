import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select, Card, Modal } from '@/components/common';
import type {
  ReportConfig,
  ReportConfigInput,
  ReportPeriod,
} from '@/services/reportService';

interface ReportConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReportConfigInput) => void;
  initialData?: ReportConfig;
  isLoading?: boolean;
}

const periodOptions = [
  { value: 'weekly', label: '週次' },
  { value: 'monthly', label: '月次' },
];

const dayOfWeekOptions = [
  { value: '0', label: '日曜日' },
  { value: '1', label: '月曜日' },
  { value: '2', label: '火曜日' },
  { value: '3', label: '水曜日' },
  { value: '4', label: '木曜日' },
  { value: '5', label: '金曜日' },
  { value: '6', label: '土曜日' },
];

const dayOfMonthOptions = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}日`,
}));

const timeOptions = Array.from({ length: 24 }, (_, i) => ({
  value: `${String(i).padStart(2, '0')}:00`,
  label: `${String(i).padStart(2, '0')}:00`,
}));

export function ReportConfigForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: ReportConfigFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [sendTime, setSendTime] = useState('09:00');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [includeProjectSummary, setIncludeProjectSummary] = useState(true);
  const [includeTaskSummary, setIncludeTaskSummary] = useState(true);
  const [includePartnerPerformance, setIncludePartnerPerformance] = useState(true);
  const [includeHighlights, setIncludeHighlights] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setPeriod(initialData.period);
      setDayOfWeek(initialData.dayOfWeek);
      setDayOfMonth(initialData.dayOfMonth);
      setSendTime(initialData.sendTime);
      setRecipients(initialData.recipients || []);
      setIncludeProjectSummary(initialData.includeProjectSummary);
      setIncludeTaskSummary(initialData.includeTaskSummary);
      setIncludePartnerPerformance(initialData.includePartnerPerformance);
      setIncludeHighlights(initialData.includeHighlights);
    } else {
      // Reset form for new config
      setName('');
      setDescription('');
      setPeriod('weekly');
      setDayOfWeek(1);
      setDayOfMonth(1);
      setSendTime('09:00');
      setRecipients([]);
      setIncludeProjectSummary(true);
      setIncludeTaskSummary(true);
      setIncludePartnerPerformance(true);
      setIncludeHighlights(true);
    }
    setErrors({});
    setNewRecipient('');
  }, [initialData, isOpen]);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addRecipient = () => {
    const trimmedEmail = newRecipient.trim();
    if (!trimmedEmail) return;

    if (!validateEmail(trimmedEmail)) {
      setErrors({ ...errors, recipient: '有効なメールアドレスを入力してください' });
      return;
    }

    if (recipients.includes(trimmedEmail)) {
      setErrors({ ...errors, recipient: 'このメールアドレスは既に追加されています' });
      return;
    }

    setRecipients([...recipients, trimmedEmail]);
    setNewRecipient('');
    setErrors({ ...errors, recipient: '' });
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRecipient();
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'レポート名は必須です';
    }

    if (recipients.length === 0) {
      newErrors.recipients = '少なくとも1つの宛先が必要です';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const data: ReportConfigInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      period,
      dayOfWeek,
      dayOfMonth,
      sendTime,
      recipients,
      includeProjectSummary,
      includeTaskSummary,
      includePartnerPerformance,
      includeHighlights,
    };

    onSubmit(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'レポート設定を編集' : '新規レポート設定'}
      size="lg"
    >
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <Input
            label="レポート名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 週次プロジェクトサマリー"
            error={errors.name}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              説明（任意）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="レポートの目的や対象を記載"
              rows={2}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Schedule Settings */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            スケジュール設定
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="レポート期間"
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
              options={periodOptions}
            />

            {period === 'weekly' ? (
              <Select
                label="送信曜日"
                value={String(dayOfWeek)}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                options={dayOfWeekOptions}
              />
            ) : (
              <Select
                label="送信日"
                value={String(dayOfMonth)}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
                options={dayOfMonthOptions}
              />
            )}

            <Select
              label="送信時刻"
              value={sendTime}
              onChange={(e) => setSendTime(e.target.value)}
              options={timeOptions}
            />
          </div>
        </Card>

        {/* Recipients */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            送信先
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="メールアドレスを入力"
                  error={errors.recipient}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={addRecipient}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {errors.recipients && (
              <p className="text-sm text-red-600">{errors.recipients}</p>
            )}

            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipients.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Content Settings */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            含めるセクション
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeProjectSummary}
                onChange={(e) => setIncludeProjectSummary(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                案件サマリー（総数、進行中、完了、遅延）
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeTaskSummary}
                onChange={(e) => setIncludeTaskSummary(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                タスクサマリー（完了率、期限超過など）
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includePartnerPerformance}
                onChange={(e) => setIncludePartnerPerformance(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                パートナーパフォーマンス
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeHighlights}
                onChange={(e) => setIncludeHighlights(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                ハイライト（成果、課題、今後の期限）
              </span>
            </label>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? '保存中...' : initialData ? '更新する' : '作成する'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
