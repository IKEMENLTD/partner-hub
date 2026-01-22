import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, BookOpen, HelpCircle, Zap, Settings } from 'lucide-react';
import { Modal, Button, Input } from '@/components/common';

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqItems: FAQItem[] = [
  {
    id: '1',
    question: 'タスクを作成するにはどうすればよいですか？',
    answer: 'プロジェクト詳細ページの「タスク」タブに移動し、「+ タスクを追加」ボタンをクリックしてください。タスク名、担当者、期限などを入力して作成できます。',
    category: 'タスク管理',
  },
  {
    id: '2',
    question: 'プロジェクトメンバーを招待する方法は？',
    answer: 'プロジェクト詳細ページの「メンバー」タブから、「メンバーを追加」ボタンをクリックし、招待したいユーザーのメールアドレスを入力してください。',
    category: 'プロジェクト管理',
  },
  {
    id: '3',
    question: '通知設定を変更するには？',
    answer: '設定ページの「通知設定」セクションから、メール通知やプッシュ通知のオン/オフを切り替えることができます。',
    category: '設定',
  },
  {
    id: '4',
    question: 'ファイルをアップロードするにはどうすればよいですか？',
    answer: 'プロジェクト詳細ページの「ファイル」タブに移動し、「ファイルをアップロード」ボタンをクリックするか、ファイルをドラッグ&ドロップしてください。',
    category: 'ファイル管理',
  },
  {
    id: '5',
    question: 'タスクの進捗状況を更新するには？',
    answer: 'タスク一覧からタスクをクリックして詳細を開き、ステータスを「未着手」「進行中」「完了」などに変更できます。',
    category: 'タスク管理',
  },
  {
    id: '6',
    question: 'ダークモードを有効にするには？',
    answer: '設定ページの「表示設定」セクションで「ダークモード」をオンにしてください。',
    category: '設定',
  },
  {
    id: '7',
    question: 'パートナー企業を登録するには？',
    answer: 'パートナー管理ページから「パートナーを追加」ボタンをクリックし、企業情報を入力して登録してください。',
    category: 'パートナー管理',
  },
  {
    id: '8',
    question: 'ダイジェストメールとは何ですか？',
    answer: 'ダイジェストメールは、毎日のタスクサマリー、期限超過タスク、未読通知などをまとめてお知らせするメールです。設定ページで配信時刻を設定できます。',
    category: '通知',
  },
];

const guideItems = [
  {
    icon: BookOpen,
    title: 'はじめての方へ',
    description: 'アプリケーションの基本的な使い方を学びましょう',
  },
  {
    icon: Zap,
    title: 'クイックスタート',
    description: '5分で始めるプロジェクト管理',
  },
  {
    icon: Settings,
    title: '高度な設定',
    description: '通知やセキュリティの詳細設定',
  },
  {
    icon: HelpCircle,
    title: 'トラブルシューティング',
    description: 'よくある問題と解決方法',
  },
];

export function HelpCenterModal({ isOpen, onClose }: HelpCenterModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFAQs = faqItems.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ヘルプセンター" size="lg">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="質問を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Guides */}
        {!searchQuery && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              使い方ガイド
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {guideItems.map((guide) => (
                <button
                  key={guide.title}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-700 p-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <guide.icon className="h-5 w-5 text-primary-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {guide.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {guide.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            よくある質問
          </h3>
          <div className="space-y-2">
            {filteredFAQs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                該当する質問が見つかりませんでした
              </p>
            ) : (
              filteredFAQs.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                        {item.category}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.question}
                      </span>
                    </div>
                    {expandedId === item.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  {expandedId === item.id && (
                    <div className="border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 px-4 py-3">
                      <p className="text-sm text-gray-600 dark:text-gray-300">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          閉じる
        </Button>
      </div>
    </Modal>
  );
}
