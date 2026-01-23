import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuthStore, useUIStore } from '@/store';
import { getUserDisplayName, Project, Partner } from '@/types';
import { useLogout, useProjects, usePartners } from '@/hooks';
import { Avatar, Badge } from '@/components/common';
import { NotificationBell } from '@/components/notifications';
import clsx from 'clsx';

// サジェストアイテムの型定義
interface SuggestItem {
  type: 'project' | 'partner';
  id: string;
  name: string;
  path: string;
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { sidebarOpen } = useUIStore();
  const { mutate: logout } = useLogout();

  // 検索用データの取得
  const { data: projectsData } = useProjects();
  const { data: partnersData } = usePartners();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // 検索機能の状態
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [selectedSuggestIndex, setSelectedSuggestIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  // 画面遷移時にドロップダウンを閉じる
  useEffect(() => {
    setIsProfileOpen(false);
    setIsSuggestOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
  };

  // 現在のページに基づいて検索コンテキストを取得
  const getSearchContext = useCallback(() => {
    const path = location.pathname;
    if (path.startsWith('/partners')) {
      return 'partners';
    }
    // デフォルトはプロジェクト（すべて検索）
    return 'projects';
  }, [location.pathname]);

  // 検索実行関数（シンプル化：常にプロジェクト一覧で全体検索）
  const executeSearch = useCallback((query: string) => {
    if (!query.trim()) return;

    const encodedQuery = encodeURIComponent(query.trim());
    const context = getSearchContext();

    // 現在のページに基づいて適切な検索先へ遷移
    if (context === 'partners') {
      navigate(`/partners?search=${encodedQuery}`);
    } else {
      // デフォルトはプロジェクト検索
      navigate(`/projects?search=${encodedQuery}`);
    }

    setSearchQuery('');
    setIsSuggestOpen(false);
  }, [navigate, getSearchContext]);

  // サジェスト候補を生成（プロジェクトとパートナー両方から）
  const generateSuggestions = useCallback((query: string): SuggestItem[] => {
    if (!query.trim() || query.length < 2) return [];

    const lowerQuery = query.toLowerCase();
    const items: SuggestItem[] = [];

    // プロジェクトからサジェスト - projectsData.data が配列
    const projectsArray = Array.isArray(projectsData?.data) ? projectsData.data : [];
    projectsArray
      .filter((p: Project) => p.name.toLowerCase().includes(lowerQuery))
      .slice(0, 4)
      .forEach((p: Project) => {
        items.push({
          type: 'project',
          id: p.id,
          name: p.name,
          path: `/projects/${p.id}`,
        });
      });

    // パートナーからサジェスト - partnersData.data が配列
    const partnersArray = Array.isArray(partnersData?.data) ? partnersData.data : [];
    partnersArray
      .filter((p: Partner) => p.name.toLowerCase().includes(lowerQuery))
      .slice(0, 4)
      .forEach((p: Partner) => {
        items.push({
          type: 'partner',
          id: p.id,
          name: p.name,
          path: `/partners/${p.id}`,
        });
      });

    return items.slice(0, 6); // 最大6件まで
  }, [projectsData, partnersData]);

  // 検索クエリ変更時にサジェストを更新
  useEffect(() => {
    const newSuggestions = generateSuggestions(searchQuery);
    setSuggestions(newSuggestions);
    setSelectedSuggestIndex(-1);
    setIsSuggestOpen(newSuggestions.length > 0 && searchQuery.length >= 2);
  }, [searchQuery, generateSuggestions]);

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
        executeSearch(searchQuery);
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
    executeSearch(searchQuery);
  };

  // サジェストアイテムのタイプラベル
  const getSuggestTypeLabel = (type: SuggestItem['type']) => {
    switch (type) {
      case 'project':
        return 'プロジェクト';
      case 'partner':
        return 'パートナー';
    }
  };

  // プレースホルダーテキスト
  const getPlaceholder = () => {
    const context = getSearchContext();
    if (context === 'partners') {
      return 'パートナーを検索...';
    }
    return '検索...';
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
      <div className="flex-1 max-w-md" ref={suggestRef}>
        <div className="relative">
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
            placeholder={getPlaceholder()}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:bg-slate-800"
          />
          <button
            type="button"
            onClick={handleSearchIconClick}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
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
                      item.type === 'partner' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
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
                  onClick={() => executeSearch(searchQuery)}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  「{searchQuery}」を検索
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationBell />

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
