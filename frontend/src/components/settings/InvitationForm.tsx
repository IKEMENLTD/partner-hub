import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Send } from 'lucide-react';
import { Button, Input, Alert } from '@/components/common';
import { organizationService } from '@/services/organizationService';

interface InvitationFormProps {
  orgId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvitationForm({ orgId, onClose, onSuccess }: InvitationFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      organizationService.createInvitation(orgId, {
        email: email.trim(),
        role,
        message: message.trim() || undefined,
      }),
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('メールアドレスを入力してください');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('有効なメールアドレスを入力してください');
      return;
    }
    setEmailError('');
    createMutation.mutate();
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">新しいメンバーを招待</h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {createMutation.isError && (
        <Alert variant="error" className="mb-4">
          {(createMutation.error as any)?.message || '招待の作成に失敗しました'}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="メールアドレス"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
          error={emailError}
          placeholder="user@example.com"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ロール
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="member">メンバー</option>
            <option value="manager">マネージャー</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            メッセージ（任意）
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="招待メールに添えるメッセージ"
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} type="button">
            キャンセル
          </Button>
          <Button
            type="submit"
            isLoading={createMutation.isPending}
            leftIcon={<Send className="h-4 w-4" />}
          >
            招待を送信
          </Button>
        </div>
      </form>
    </div>
  );
}
