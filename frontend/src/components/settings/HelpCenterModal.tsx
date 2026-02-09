import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, BookOpen, HelpCircle, Zap, Settings, ArrowLeft } from 'lucide-react';
import { Modal } from '@/components/common';

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

type GuideType = 'beginner' | 'quickstart' | 'advanced' | 'troubleshooting' | null;

// カテゴリの表示順序を定義
const categoryOrder = [
  'プロジェクト管理',
  'タスク管理',
  'ファイル管理',
  'パートナー管理',
  '通知',
  '設定',
];

const faqItems: FAQItem[] = [
  // プロジェクト管理
  {
    id: '1',
    question: 'プロジェクトメンバーを招待する方法は？',
    answer: 'プロジェクト詳細ページの「メンバー」タブから、「メンバーを追加」ボタンをクリックし、招待したいユーザーのメールアドレスを入力してください。',
    category: 'プロジェクト管理',
  },
  {
    id: '2',
    question: 'プロジェクトの進捗を確認するには？',
    answer: 'プロジェクト詳細ページの「概要」タブでプロジェクト全体の進捗を確認できます。また、ダッシュボードでは担当プロジェクト一覧と進捗状況を一目で確認できます。',
    category: 'プロジェクト管理',
  },
  // タスク管理
  {
    id: '3',
    question: 'タスクを作成するにはどうすればよいですか？',
    answer: 'プロジェクト詳細ページの「タスク」タブに移動し、「+ タスクを追加」ボタンをクリックしてください。タスク名、担当者、期限などを入力して作成できます。',
    category: 'タスク管理',
  },
  {
    id: '4',
    question: 'タスクの進捗状況を更新するには？',
    answer: 'タスク一覧からタスクをクリックして詳細を開き、ステータスを「未着手」「進行中」「完了」などに変更できます。',
    category: 'タスク管理',
  },
  // ファイル管理
  {
    id: '5',
    question: 'ファイルをアップロードするにはどうすればよいですか？',
    answer: 'プロジェクト詳細ページの「ファイル」タブに移動し、「ファイルをアップロード」ボタンをクリックするか、ファイルをドラッグ&ドロップしてください。',
    category: 'ファイル管理',
  },
  // パートナー管理
  {
    id: '6',
    question: 'パートナー企業を登録するには？',
    answer: 'パートナー管理ページから「パートナーを追加」ボタンをクリックし、企業情報を入力して登録してください。',
    category: 'パートナー管理',
  },
  // 通知
  {
    id: '7',
    question: 'ダイジェストメールとは何ですか？',
    answer: 'ダイジェストメールは、毎日のタスクサマリー、期限超過タスク、未読通知などをまとめてお知らせするメールです。設定ページで配信時刻を設定できます。',
    category: '通知',
  },
  // 設定
  {
    id: '8',
    question: '通知設定を変更するには？',
    answer: '設定ページの「通知設定」セクションから、メール通知やプッシュ通知のオン/オフを切り替えることができます。',
    category: '設定',
  },
  {
    id: '9',
    question: 'ダークモードを有効にするには？',
    answer: '設定ページの「表示設定」セクションで「ダークモード」をオンにしてください。',
    category: '設定',
  },
];

// ガイドコンテンツの定義
const guideContents: Record<string, { title: string; sections: { heading: string; content: string }[] }> = {
  beginner: {
    title: 'はじめての方へ',
    sections: [
      {
        heading: 'Partner Hubへようこそ',
        content: 'Partner Hubは、パートナー企業との協業を効率化するプラットフォームです。プロジェクト管理、タスク管理、ファイル共有などの機能を提供します。',
      },
      {
        heading: 'ダッシュボードの見方',
        content: 'ログイン後、最初に表示されるのがダッシュボードです。今日のタスク、対応待ちの案件、最近のアクティビティなどを一目で確認できます。',
      },
      {
        heading: '基本的なナビゲーション',
        content: '左側のサイドバーから各機能にアクセスできます。「マイトゥデイ」で今日のタスクを確認、「プロジェクト」でプロジェクト一覧を表示、「パートナー」でパートナー企業を管理できます。',
      },
      {
        heading: 'プロフィールの設定',
        content: '右上のアバターアイコンをクリックして「プロフィール」を選択すると、名前やアバター画像を設定できます。',
      },
    ],
  },
  quickstart: {
    title: 'クイックスタート',
    sections: [
      {
        heading: 'ステップ1: プロジェクトを作成',
        content: 'サイドバーの「プロジェクト」→「新規プロジェクト」をクリック。プロジェクト名、説明、期間を入力して作成します。',
      },
      {
        heading: 'ステップ2: パートナーを追加',
        content: 'プロジェクト詳細ページの「メンバー」タブから、協業するパートナー企業を追加します。',
      },
      {
        heading: 'ステップ3: タスクを登録',
        content: 'プロジェクトの「タスク」タブで、やるべき作業をタスクとして登録。担当者と期限を設定しましょう。',
      },
      {
        heading: 'ステップ4: 進捗を管理',
        content: 'タスクのステータスを更新して進捗を管理。ダッシュボードやレポートで全体の状況を把握できます。',
      },
      {
        heading: 'ステップ5: ファイルを共有',
        content: 'プロジェクトの「ファイル」タブで、関連ドキュメントをアップロード。チームメンバーと共有できます。',
      },
    ],
  },
  advanced: {
    title: '高度な設定',
    sections: [
      {
        heading: '通知設定のカスタマイズ',
        content: '設定ページの「通知設定」で、通知の種類ごとにオン/オフを切り替えられます。ダイジェストメールの配信時刻も設定可能です。',
      },
      {
        heading: 'リマインダー設定',
        content: 'タスクの期限前にリマインダーを受け取る回数を設定できます。1回から10回まで、お好みで調整してください。',
      },
      {
        heading: 'テンプレートの活用',
        content: 'よく使うプロジェクト構成はテンプレートとして保存できます。新規プロジェクト作成時にテンプレートを選択すると、タスクが自動で作成されます。',
      },
      {
        heading: 'エスカレーション設定',
        content: '期限超過や進捗遅延時に自動でマネージャーに通知するエスカレーションルールを設定できます。',
      },
      {
        heading: 'レポート出力',
        content: 'マネージャーダッシュボードから、週次・月次のレポートをPDF、Excel、CSV形式で出力できます。',
      },
    ],
  },
  troubleshooting: {
    title: 'トラブルシューティング',
    sections: [
      {
        heading: 'ログインできない場合',
        content: 'パスワードをお忘れの場合は、ログイン画面の「パスワードを忘れた方」リンクからリセットできます。メールが届かない場合は、迷惑メールフォルダを確認してください。',
      },
      {
        heading: '通知が届かない場合',
        content: '設定ページで通知がオンになっているか確認してください。また、メールの受信設定やブラウザの通知許可設定も確認してください。',
      },
      {
        heading: 'ファイルがアップロードできない場合',
        content: 'ファイルサイズの上限は10MBです。対応形式はPDF、画像（PNG、JPG、GIF）、ドキュメント（DOC、DOCX、XLS、XLSX）です。',
      },
      {
        heading: '画面の表示がおかしい場合',
        content: 'ブラウザのキャッシュをクリアしてから、ページを再読み込みしてください。それでも改善しない場合は、別のブラウザでお試しください。',
      },
      {
        heading: 'エラーメッセージが表示された場合',
        content: 'エラーメッセージをスクリーンショットに撮り、お問い合わせフォームからサポートチームにご連絡ください。',
      },
    ],
  },
};

const guideItems = [
  {
    key: 'beginner' as GuideType,
    icon: BookOpen,
    title: 'はじめての方へ',
    description: 'アプリケーションの基本的な使い方を学びましょう',
  },
  {
    key: 'quickstart' as GuideType,
    icon: Zap,
    title: 'クイックスタート',
    description: '5分で始めるプロジェクト管理',
  },
  {
    key: 'advanced' as GuideType,
    icon: Settings,
    title: '高度な設定',
    description: '通知やセキュリティの詳細設定',
  },
  {
    key: 'troubleshooting' as GuideType,
    icon: HelpCircle,
    title: 'トラブルシューティング',
    description: 'よくある問題と解決方法',
  },
];

export function HelpCenterModal({ isOpen, onClose }: HelpCenterModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<GuideType>(null);

  // モーダルが開かれたときに状態をリセット
  useEffect(() => {
    if (isOpen) {
      setExpandedId(null);
      setSelectedGuide(null);
    }
  }, [isOpen]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleGuideClick = (guideKey: GuideType) => {
    setSelectedGuide(guideKey);
  };

  const handleBackToMain = () => {
    setSelectedGuide(null);
  };

  // ガイド詳細表示
  if (selectedGuide && guideContents[selectedGuide]) {
    const guide = guideContents[selectedGuide];
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={guide.title} size="lg">
        <div className="space-y-6">
          {/* 戻るボタン */}
          <button
            onClick={handleBackToMain}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            <ArrowLeft className="h-4 w-4" />
            ヘルプセンターに戻る
          </button>

          {/* ガイドコンテンツ */}
          <div className="space-y-6">
            {guide.sections.map((section, index) => (
              <div key={index} className="space-y-2">
                <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-sm font-bold text-primary-600 dark:text-primary-400">
                    {index + 1}
                  </span>
                  {section.heading}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 pl-8">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>

      </Modal>
    );
  }

  // メイン表示
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ヘルプセンター" size="lg">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Quick Guides */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            使い方ガイド
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {guideItems.map((guide) => (
              <button
                key={guide.title}
                onClick={() => handleGuideClick(guide.key)}
                className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-700 p-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group"
              >
                <guide.icon className="h-5 w-5 text-primary-500 mt-0.5 group-hover:text-primary-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
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

        {/* FAQ */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            よくある質問
          </h3>
          <div className="space-y-4">
            {categoryOrder.map((category) => {
              const categoryFAQs = faqItems.filter((item) => item.category === category);
              if (categoryFAQs.length === 0) return null;
              return (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                    {category}
                  </h4>
                  {categoryFAQs.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.question}
                        </span>
                        {expandedId === item.id ? (
                          <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                      {expandedId === item.id && (
                        <div className="border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 px-4 py-3">
                          <p className="text-sm text-gray-600 dark:text-gray-300">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
