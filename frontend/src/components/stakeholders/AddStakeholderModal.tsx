import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import type {
  ProjectStakeholder,
  StakeholderInput,
  StakeholderTier,
} from '@/types';
import { getUserDisplayName, getPartnerDisplayName } from '@/types';
import {
  Modal,
  ModalFooter,
  Button,
  Input,
  Select,
  Avatar,
  Badge,
} from '@/components/common';
import { usePartners } from '@/hooks';
import clsx from 'clsx';

interface AddStakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StakeholderInput) => void;
  projectId: string;
  existingStakeholders?: ProjectStakeholder[];
  editingStakeholder?: ProjectStakeholder | null;
  isLoading?: boolean;
}

const tierOptions = [
  { value: '1', label: 'Tier 1 - 主要関係者' },
  { value: '2', label: 'Tier 2 - 重要関係者' },
  { value: '3', label: 'Tier 3 - 一般関係者' },
];

export function AddStakeholderModal({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  existingStakeholders = [],
  editingStakeholder,
  isLoading = false,
}: AddStakeholderModalProps) {
  // フォーム状態
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [tier, setTier] = useState<StakeholderTier>(1);
  const [parentStakeholderId, setParentStakeholderId] = useState<string>('');
  const [roleDescription, setRoleDescription] = useState<string>('');
  const [contractAmount, setContractAmount] = useState<string>('');
  const [isPrimary, setIsPrimary] = useState<boolean>(false);

  // 検索状態
  const [searchQuery, setSearchQuery] = useState<string>('');

  // パートナー一覧を取得
  const { data: partnersData } = usePartners({
    status: 'active',
    search: searchQuery || undefined,
  });
  const partners = partnersData?.data || [];

  // 既に追加済みのパートナーIDを取得
  const safeStakeholders = Array.isArray(existingStakeholders) ? existingStakeholders : [];
  const existingPartnerIds = new Set(
    safeStakeholders
      .filter((s) => s.partnerId && (!editingStakeholder || s.id !== editingStakeholder.id))
      .map((s) => s.partnerId!)
  );

  // 利用可能なパートナー
  const availablePartners = partners.filter(
    (p) => !existingPartnerIds.has(p.id)
  );

  // 編集モードの場合、初期値を設定
  useEffect(() => {
    if (editingStakeholder) {
      setSelectedPartnerId(editingStakeholder.partnerId || '');
      setTier(editingStakeholder.tier);
      setParentStakeholderId(editingStakeholder.parentStakeholderId || '');
      setRoleDescription(editingStakeholder.roleDescription || '');
      setContractAmount(
        editingStakeholder.contractAmount
          ? String(editingStakeholder.contractAmount)
          : ''
      );
      setIsPrimary(editingStakeholder.isPrimary);
    } else {
      resetForm();
    }
  }, [editingStakeholder, isOpen]);

  const resetForm = () => {
    setSelectedPartnerId('');
    setTier(1);
    setParentStakeholderId('');
    setRoleDescription('');
    setContractAmount('');
    setIsPrimary(false);
    setSearchQuery('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    const data: StakeholderInput = {
      projectId,
      tier,
      isPrimary,
    };

    if (selectedPartnerId) {
      data.partnerId = selectedPartnerId;
    }

    if (parentStakeholderId) {
      data.parentStakeholderId = parentStakeholderId;
    }

    if (roleDescription.trim()) {
      data.roleDescription = roleDescription.trim();
    }

    if (contractAmount) {
      data.contractAmount = parseInt(contractAmount, 10);
    }

    onSubmit(data);
  };

  const isValid = editingStakeholder ? true : !!selectedPartnerId;

  // 親ステークホルダーの選択肢
  const parentOptions = safeStakeholders
    .filter(
      (s) =>
        (!editingStakeholder || s.id !== editingStakeholder.id) &&
        s.tier < tier
    )
    .map((s) => {
      const name = s.user
        ? getUserDisplayName(s.user)
        : s.partner
        ? getPartnerDisplayName(s.partner)
        : '不明';
      return {
        value: s.id,
        label: `${name} (Tier ${s.tier})`,
      };
    });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingStakeholder ? '関係者を編集' : '関係者を追加'}
      size="lg"
    >
      <div className="space-y-6">
        {/* パートナー選択ラベル（パートナーのみサポート） */}

        {/* パートナー選択 */}
        {!editingStakeholder && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              パートナーを選択 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="パートナー名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="mb-3"
            />
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg divide-y divide-gray-100 dark:divide-slate-700">
              {availablePartners.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {searchQuery
                    ? '検索結果がありません'
                    : '利用可能なパートナーがいません'}
                </div>
              ) : (
                availablePartners.map((partner) => (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => setSelectedPartnerId(partner.id)}
                    className={clsx(
                      'w-full flex items-center gap-3 p-3 text-left transition-colors',
                      selectedPartnerId === partner.id
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                    )}
                  >
                    <Avatar
                      name={getPartnerDisplayName(partner)}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {getPartnerDisplayName(partner)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {partner.email}
                      </p>
                    </div>
                    {selectedPartnerId === partner.id && (
                      <Badge variant="primary" size="sm">
                        選択中
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* 編集中のパートナー/ユーザー表示 */}
        {editingStakeholder && (
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <Avatar
                name={
                  editingStakeholder.user
                    ? getUserDisplayName(editingStakeholder.user)
                    : editingStakeholder.partner
                    ? getPartnerDisplayName(editingStakeholder.partner)
                    : '不明'
                }
                src={editingStakeholder.user?.avatarUrl}
                size="md"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {editingStakeholder.user
                    ? getUserDisplayName(editingStakeholder.user)
                    : editingStakeholder.partner
                    ? getPartnerDisplayName(editingStakeholder.partner)
                    : '不明'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {editingStakeholder.user ? 'ユーザー' : 'パートナー'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ティア選択 */}
        <Select
          label="ティア"
          options={tierOptions}
          value={String(tier)}
          onChange={(e) => setTier(parseInt(e.target.value, 10) as StakeholderTier)}
          required
        />

        {/* 親ステークホルダー選択 */}
        {parentOptions.length > 0 && (
          <Select
            label="親関係者 (オプション)"
            options={[{ value: '', label: '-- 選択しない --' }, ...parentOptions]}
            value={parentStakeholderId}
            onChange={(e) => setParentStakeholderId(e.target.value)}
            helperText="ツリー表示で親子関係を設定します"
          />
        )}

        {/* 役割 */}
        <Input
          label="役割"
          placeholder="例: プロジェクトマネージャー、開発リーダー"
          value={roleDescription}
          onChange={(e) => setRoleDescription(e.target.value)}
        />

        {/* フラグ */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">主担当</span>
          </label>
        </div>

        {/* 契約金額 */}
        <Input
          label="契約金額 (オプション)"
          type="number"
          placeholder="0"
          value={contractAmount}
          onChange={(e) => setContractAmount(e.target.value)}
          helperText="円単位で入力してください"
        />

        {/* 契約金額の後ろ - 連絡先はパートナーマスタから参照 */}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
          キャンセル
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!isValid}
        >
          {editingStakeholder ? '更新' : '追加'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// 削除確認モーダル
interface DeleteStakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stakeholder: ProjectStakeholder | null;
  isLoading?: boolean;
}

export function DeleteStakeholderModal({
  isOpen,
  onClose,
  onConfirm,
  stakeholder,
  isLoading = false,
}: DeleteStakeholderModalProps) {
  if (!stakeholder) return null;

  const name = stakeholder.user
    ? getUserDisplayName(stakeholder.user)
    : stakeholder.partner
    ? getPartnerDisplayName(stakeholder.partner)
    : '不明';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="関係者の削除" size="sm">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        「<span className="font-medium text-gray-900 dark:text-gray-100">{name}</span>
        」をプロジェクトの関係者から削除しますか？
      </p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
        この操作は取り消せません。
      </p>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          キャンセル
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
          削除
        </Button>
      </ModalFooter>
    </Modal>
  );
}
