import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Power,
  PowerOff,
  Clock,
  TrendingDown,
  History,
} from 'lucide-react';
import {
  useEscalationRules,
  useCreateEscalationRule,
  useUpdateEscalationRule,
  useDeleteEscalationRule,
  useEscalationLogs,
} from '@/hooks/useEscalations';
import type {
  EscalationTriggerType,
  EscalationAction,
  EscalationRule,
  CreateEscalationRuleInput,
  EscalationLogStatus,
} from '@/services/escalationService';
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  TextArea,
  PageLoading,
  EmptyState,
  Badge,
  Modal,
} from '@/components/common';
import clsx from 'clsx';

const TRIGGER_TYPE_OPTIONS = [
  { value: 'days_after_due', label: '期限超過（N日後）' },
  { value: 'days_before_due', label: '期限前（N日前）' },
  { value: 'progress_below', label: '進捗率（N%未満）' },
];

const ACTION_OPTIONS = [
  { value: 'notify_owner', label: 'タスク担当者に通知' },
  { value: 'notify_stakeholders', label: '担当者＋関係者に通知' },
  { value: 'escalate_to_manager', label: '組織のADMIN全員に通知' },
];

const actionLabel: Record<EscalationAction, string> = {
  notify_owner: 'タスク担当者',
  notify_stakeholders: '担当者＋関係者',
  escalate_to_manager: 'ADMIN全員',
};

const logStatusConfig: Record<EscalationLogStatus, { label: string; variant: 'default' | 'success' | 'danger' | 'warning' }> = {
  pending: { label: '処理中', variant: 'warning' },
  executed: { label: '実行済み', variant: 'success' },
  failed: { label: '失敗', variant: 'danger' },
};

type Tab = 'rules' | 'logs';

interface RuleFormData {
  name: string;
  description: string;
  triggerType: EscalationTriggerType;
  triggerValue: number;
  action: EscalationAction;
  priority: number;
}

const defaultFormData: RuleFormData = {
  name: '',
  description: '',
  triggerType: 'days_after_due',
  triggerValue: 1,
  action: 'notify_owner',
  priority: 1,
};

export function EscalationRulesPage() {
  const { data: rulesData, isLoading: isLoadingRules } = useEscalationRules();
  const { data: logsData, isLoading: isLoadingLogs } = useEscalationLogs();
  const { mutate: createRule, isPending: isCreating } = useCreateEscalationRule();
  const { mutate: updateRule, isPending: isUpdating } = useUpdateEscalationRule();
  const { mutate: deleteRule } = useDeleteEscalationRule();

  const [tab, setTab] = useState<Tab>('rules');
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const rules = rulesData?.data || [];
  const logs = logsData?.data || [];

  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  const handleOpenEdit = (rule: EscalationRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      triggerType: rule.triggerType,
      triggerValue: rule.triggerValue,
      action: rule.action,
      priority: rule.priority,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    const input: CreateEscalationRuleInput = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      triggerType: formData.triggerType,
      triggerValue: formData.triggerValue,
      action: formData.action,
      priority: formData.priority,
    };

    if (editingRule) {
      updateRule({ id: editingRule.id, input }, { onSuccess: () => setShowModal(false) });
    } else {
      createRule(input, { onSuccess: () => setShowModal(false) });
    }
  };

  const handleToggleStatus = (rule: EscalationRule) => {
    const newStatus = rule.status === 'active' ? 'inactive' : 'active';
    updateRule({ id: rule.id, input: { status: newStatus } });
  };

  const handleDelete = (id: string) => {
    deleteRule(id, { onSuccess: () => setDeleteConfirmId(null) });
  };

  const getTriggerDescription = (rule: EscalationRule) => {
    if (rule.triggerType === 'progress_below') {
      return `進捗率が ${rule.triggerValue}% 未満`;
    }
    if (rule.triggerType === 'days_before_due') {
      return `期限の ${rule.triggerValue} 日前`;
    }
    return `期限を ${rule.triggerValue} 日超過`;
  };

  if (isLoadingRules) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">エスカレーション設定</h1>
          <p className="mt-1 text-gray-600">
            タスクの遅延や進捗停滞時の自動通知ルールを管理します
          </p>
        </div>
        {tab === 'rules' && (
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenCreate}
          >
            ルール追加
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('rules')}
          className={clsx(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            tab === 'rules'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            ルール ({rules.length})
          </div>
        </button>
        <button
          onClick={() => setTab('logs')}
          className={clsx(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            tab === 'logs'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" />
            実行履歴
          </div>
        </button>
      </div>

      {/* Rules Tab */}
      {tab === 'rules' && (
        <>
          {rules.length === 0 ? (
            <Card className="py-12">
              <EmptyState
                icon={<AlertTriangle className="h-12 w-12" />}
                title="ルールが設定されていません"
                description="エスカレーションルールを追加して、タスク遅延時の自動通知を設定しましょう"
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {rules
                .sort((a, b) => a.priority - b.priority)
                .map((rule) => (
                  <Card
                    key={rule.id}
                    className={clsx(
                      rule.status === 'inactive' && 'opacity-60'
                    )}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-medium text-gray-900">
                              {rule.name}
                            </h3>
                            <Badge variant={rule.status === 'active' ? 'success' : 'default'}>
                              {rule.status === 'active' ? '有効' : '無効'}
                            </Badge>
                            <Badge variant="info">
                              優先度 {rule.priority}
                            </Badge>
                          </div>
                          {rule.description && (
                            <p className="mt-1 text-sm text-gray-500">{rule.description}</p>
                          )}
                          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              {rule.triggerType === 'progress_below' ? (
                                <TrendingDown className="h-4 w-4 text-yellow-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-orange-500" />
                              )}
                              {getTriggerDescription(rule)}
                            </span>
                            <span>→</span>
                            <span className="font-medium">
                              {actionLabel[rule.action]}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleStatus(rule)}
                            className={clsx(
                              'rounded p-1.5 hover:bg-gray-100',
                              rule.status === 'active' ? 'text-green-500' : 'text-gray-400'
                            )}
                            title={rule.status === 'active' ? '無効にする' : '有効にする'}
                          >
                            {rule.status === 'active' ? (
                              <Power className="h-4 w-4" />
                            ) : (
                              <PowerOff className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(rule)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="編集"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(rule.id)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                            title="削除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </>
      )}

      {/* Logs Tab */}
      {tab === 'logs' && (
        <>
          {isLoadingLogs ? (
            <PageLoading />
          ) : logs.length === 0 ? (
            <Card className="py-12">
              <EmptyState
                icon={<History className="h-12 w-12" />}
                title="実行履歴はありません"
                description="エスカレーションが発動すると、ここに履歴が表示されます"
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const sConfig = logStatusConfig[log.status] || logStatusConfig.pending;
                return (
                  <Card key={log.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={sConfig.variant}>{sConfig.label}</Badge>
                            <Badge variant="default">{actionLabel[log.action]}</Badge>
                            {log.rule && (
                              <span className="text-sm text-gray-500">
                                ルール: {log.rule.name}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            {log.task && <span>タスク: {log.task.title}</span>}
                            {log.project && <span className="ml-3">案件: {log.project.name}</span>}
                          </div>
                          {log.actionDetail && (
                            <p className="mt-1 text-sm text-gray-500">{log.actionDetail}</p>
                          )}
                          {log.errorMessage && (
                            <p className="mt-1 text-sm text-red-500">{log.errorMessage}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {format(new Date(log.createdAt), 'M/d HH:mm', { locale: ja })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingRule ? 'ルールを編集' : '新規ルール作成'}
      >
        <div className="space-y-4">
          <Input
            label="ルール名"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            placeholder="例: 3日超過 → ADMIN通知"
            required
          />

          <TextArea
            label="説明"
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            placeholder="ルールの説明（任意）"
            rows={2}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="トリガー条件"
              value={formData.triggerType}
              onChange={(e) => setFormData((p) => ({
                ...p,
                triggerType: e.target.value as EscalationTriggerType,
              }))}
              options={TRIGGER_TYPE_OPTIONS}
            />

            <Input
              label={
                formData.triggerType === 'progress_below' ? 'しきい値（%）' : '日数'
              }
              type="number"
              value={String(formData.triggerValue)}
              onChange={(e) => setFormData((p) => ({
                ...p,
                triggerValue: Math.max(1, Number(e.target.value) || 1),
              }))}
              min={1}
            />
          </div>

          <Select
            label="アクション（通知先）"
            value={formData.action}
            onChange={(e) => setFormData((p) => ({
              ...p,
              action: e.target.value as EscalationAction,
            }))}
            options={ACTION_OPTIONS}
          />

          <Input
            label="優先度（小さいほど先に評価）"
            type="number"
            value={String(formData.priority)}
            onChange={(e) => setFormData((p) => ({
              ...p,
              priority: Math.max(1, Number(e.target.value) || 1),
            }))}
            min={1}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={isCreating || isUpdating}
              disabled={!formData.name.trim()}
            >
              {editingRule ? '更新' : '作成'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="ルールの削除"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            このエスカレーションルールを削除しますか？この操作は取り消せません。
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              削除
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
