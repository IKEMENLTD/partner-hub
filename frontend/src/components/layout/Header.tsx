import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Search, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuthStore, useUIStore } from '@/store';
import { getUserDisplayName, Alert, Project, Partner } from '@/types';
import { useLogout, useAlerts, useProjects, usePartners } from '@/hooks';
import { Avatar, Badge } from '@/components/common';
import clsx from 'clsx';

// 検索対象の型定義
type SearchTarget = 'all' | 'projects' | 'partners' | 'tasks';

// 検索対象のラベル
const searchTargetLabels: Record<SearchTarget, string> = {
  all: 'すべて',
  projects: 'プロジェクト',
  partners: 'パートナー',
  tasks: 'タスク',
};

// サジェストアイテムの型定義
interface SuggestItem {
  type: 'project' | 'partner' | 'task';
  id: string;
  name: string;
  path: string;
}

export function Header() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { sidebarOpen } = useUIStore();
  const { mutate: logout } = useLogout();
  const { data: alertsData } = useAlerts();

  // 検索用データの取得
  const { data: projectsData } = useProjects();
  const { data: partnersData } = usePartners();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // 検索機能の状態
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTarget, setSearchTarget] = useState<SearchTarget>('all');
  const [isSearchTargetOpen, setIsSearchTargetOpen] = useState(false);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [selectedSuggestIndex, setSelectedSuggestIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  const alerts: Alert[] = alertsData || [];
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const handleLogout = () => {
    logout();
  };

  // 検索実行関数
  const executeSearch = useCallback((query: string, target: SearchTarget) => {
    if (!query.trim()) return;

    const encodedQuery = encodeURIComponent(query.trim());

    switch (target) {
      case 'projects':
        navigate(`/projects?search=${encodedQuery}`);
        break;
      case 'partners':
        navigate(`/partners?search=${encodedQuery}`);
        break;
      case 'tasks':
        // タスクはプロジェクト内で検索
        navigate(`/projects?taskSearch=${encodedQuery}`);
        break;
      case 'all':
      default:
        // すべての場合はプロジェクト一覧に遷移（全体検索として）
        navigate(`/projects?search=${encodedQuery}&searchAll=true`);
        break;
    }

    setSearchQuery('');
    setIsSuggestOpen(false);
  }, [navigate]);

  // サジェスト候補を生成
  const generateSuggestions = useCallback((query: string, target: SearchTarget): SuggestItem[] => {
    if (!query.trim() || query.length < 2) return [];

    const lowerQuery = query.toLowerCase();
    const items: SuggestItem[] = [];

    // プロジェクトからサジェスト
    if (target === 'all' || target === 'projects') {
      const projects = (projectsData && 'data' in projectsData ? projectsData.data : projectsData) || [];
      (projects as Project[])
        .filter((p: Project) => p.name.toLowerCase().includes(lowerQuery))
        .slice(0, 3)
        .forEach((p: Project) => {
          items.push({
            type: 'project',
            id: p.id,
            name: p.name,
            path: `/projects/${p.id}`,
          });
        });
    }

    // パートナーからサジェスト
    if (target === 'all' || target === 'partners') {
      const partners = (partnersData && 'data' in partnersData ? partnersData.data : partnersData) || [];
      (partners as Partner[])
        .filter((p: Partner) => p.name.toLowerCase().includes(lowerQuery))
        .slice(0, 3)
        .forEach((p: Partner) => {
          items.push({
            type: 'partner',
            id: p.id,
            name: p.name,
            path: `/partners/${p.id}`,
          });
        });
    }

    // タスク検索は検索結果ページで行う（サジェストには含めない）
    // タスク検索時は /projects?taskSearch=xxx に遷移

    return items.slice(0, 8); // 最大8件まで
  }, [projectsData, partnersData]);

  // 検索クエリ変更時にサジェストを更新
  useEffect(() => {
    const newSuggestions = generateSuggestions(searchQuery, searchTarget);
    setSuggestions(newSuggestions);
    setSelectedSuggestIndex(-1);
    setIsSuggestOpen(newSuggestions.length > 0 && searchQuery.length >= 2);
  }, [searchQuery, searchTarget, generateSuggestions]);

  // クリック外でサジェストを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(event.target as Node)) {
        setIsSuggestOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 検索入力のキーボードハンドラ
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestIndex >= 0 && suggestions[selectedSuggestIndex]) {
        // サジェストが選択されている場合は直接遷移
        navigate(suggestions[selectedSuggestIndex].path);
        setSearchQuery('');
        setIsSuggestOpen(false);
      } else {
        // 通常の検索実行
        executeSearch(searchQuery, searchTarget);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setIsSuggestOpen(false);
      setSelectedSuggestIndex(-1);
    }
  };

  // サジェストアイテムクリック
  const handleSuggestClick = (item: SuggestItem) => {
    navigate(item.path);
    setSearchQuery('');
    setIsSuggestOpen(false);
  };

  // 検索アイコンクリック
  const handleSearchIconClick = () => {
    executeSearch(searchQuery, searchTarget);
  };

  // サジェストアイテムのタイプラベル
  const getSuggestTypeLabel = (type: SuggestItem['type']) => {
    switch (type) {
      case 'project':
        return 'プロジェクト';
      case 'partner':
        return 'パートナー';
      case 'task':
        return 'タスク';
    }
  };

  return (
    <header
      className={clsx(
        'fixed top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 transition-all duration-300',
        sidebarOpen ? 'left-64' : 'left-16',
        'right-0'
      )}
    >
      {/* Search */}
      <div className="flex-1 max-w-lg" ref={suggestRef}>
        <div className="relative flex items-center gap-2">
          {/* 検索対象ドロップダウン */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSearchTargetOpen(!isSearchTargetOpen)}
              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"
            >
              <span className="whitespace-nowrap">{searchTargetLabels[searchTarget]}</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {isSearchTargetOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSearchTargetOpen(false)}
                />
                <div className="absolute left-0 top-full z-50 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  {(Object.keys(searchTargetLabels) as SearchTarget[]).map((target) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => {
                        setSearchTarget(target);
                        setIsSearchTargetOpen(false);
                        searchInputRef.current?.focus();
                      }}
                      className={clsx(
                        'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700',
                        searchTarget === target
                          ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300'
                      )}
                    >
                      {searchTargetLabels[target]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 検索入力フィールド */}
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (suggestions.length > 0 && searchQuery.length >= 2) {
                  setIsSuggestOpen(true);
                }
              }}
              placeholder={`${searchTargetLabels[searchTarget]}を検索...`}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-4 pr-10 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:bg-slate-800"
            />
            <button
              type="button"
              onClick={handleSearchIconClick}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              aria-label="検索"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* サジェスト候補 */}
            {isSuggestOpen && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {suggestions.map((item, index) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => handleSuggestClick(item)}
                    className={clsx(
                      'flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700',
                      selectedSuggestIndex === index && 'bg-gray-100 dark:bg-slate-700'
                    )}
                  >
                    <span
                      className={clsx(
                        'rounded px-2 py-0.5 text-xs font-medium',
                        item.type === 'project' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        item.type === 'partner' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        item.type === 'task' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      )}
                    >
                      {getSuggestTypeLabel(item.type)}
                    </span>
                    <span className="flex-1 truncate text-gray-900 dark:text-gray-100">
                      {item.name}
                    </span>
                  </button>
                ))}
                <div className="border-t border-gray-200 px-4 py-2 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => executeSearch(searchQuery, searchTarget)}
                    className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    「{searchQuery}」で{searchTargetLabels[searchTarget]}を検索
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            aria-label="通知"
            aria-expanded={isNotificationOpen}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsNotificationOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                <div className="border-b border-gray-200 dark:border-slate-700 px-4 py-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">通知</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      通知はありません
                    </p>
                  ) : (
                    <ul>
                      {alerts.slice(0, 5).map((alert) => (
                        <li
                          key={alert.id}
                          className={clsx(
                            'border-b border-gray-100 px-4 py-3 last:border-b-0',
                            !alert.isRead && 'bg-blue-50'
                          )}
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {alert.title}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {alert.message}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {alerts.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-3">
                    <Link
                      to="/notifications"
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                      onClick={() => setIsNotificationOpen(false)}
                    >
                      すべての通知を見る
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800"
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
          >
            <Avatar name={getUserDisplayName(user) || 'User'} src={user?.avatarUrl} size="sm" />
            <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-300 md:block">
              {getUserDisplayName(user)}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>

          {isProfileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsProfileOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg">
                <div className="border-b border-gray-200 dark:border-slate-700 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{getUserDisplayName(user)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  <Badge variant="primary" size="sm" className="mt-2">
                    {user?.role === 'admin'
                      ? '管理者'
                      : user?.role === 'manager'
                      ? 'マネージャー'
                      : user?.role === 'partner'
                      ? 'パートナー'
                      : 'メンバー'}
                  </Badge>
                </div>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <User className="h-4 w-4" />
                  プロフィール
                </Link>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <LogOut className="h-4 w-4" />
                  ログアウト
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
