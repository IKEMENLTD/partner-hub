import { useState, useMemo } from 'react';
import { Modal, ModalFooter, Button, TextArea } from '@/components/common';

interface BulkAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (titles: string[]) => void;
  isLoading?: boolean;
}

export function BulkAddTaskModal({ isOpen, onClose, onSubmit, isLoading }: BulkAddTaskModalProps) {
  const [text, setText] = useState('');

  const { titles, error } = useMemo(() => {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const tooLong = lines.find((line) => line.length > 200);
    if (tooLong) {
      return {
        titles: lines,
        error: `タイトルは200文字以内にしてください: 「${tooLong.substring(0, 30)}...」`,
      };
    }

    return { titles: lines, error: undefined };
  }, [text]);

  const handleSubmit = () => {
    if (titles.length === 0 || error) return;
    onSubmit(titles);
  };

  const handleClose = () => {
    setText('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="タスクを一括追加" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          1行に1つのタスク名を入力してください
        </p>
        <TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"キックオフミーティング\n要件定義\n基本設計\n詳細設計\n開発\nテスト"}
          rows={8}
          error={error}
          style={{ resize: 'vertical' }}
        />
        {titles.length > 0 && !error && (
          <p className="text-sm text-gray-600">
            {titles.length}件のタスクを追加します
          </p>
        )}
      </div>
      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={titles.length === 0 || !!error}
        >
          一括追加
        </Button>
      </ModalFooter>
    </Modal>
  );
}
