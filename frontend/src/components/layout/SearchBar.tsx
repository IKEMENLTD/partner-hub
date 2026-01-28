import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, FolderOpen, Users, CheckSquare, Command } from 'lucide-react';
import { useGlobalSearch } from '@/hooks/useSearch';
import { SearchResultItem } from '@/services/searchService';
import clsx from 'clsx';

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const navigate = useNavigate();
  const { query, setQuery, results, isLoading, isFetching, clearSearch, hasResults, isQueryValid } =
    useGlobalSearch(300);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Flatten results for keyboard navigation
  const flatResults: SearchResultItem[] = results
    ? [...results.projects, ...results.partners, ...results.tasks].sort(
        (a, b) => b.relevance - a.relevance
      )
    : [];

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || flatResults.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        e.preventDefault();
        navigate(`/projects?search=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
        clearSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flatResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && flatResults[selectedIndex]) {
          handleResultClick(flatResults[selectedIndex]);
        } else if (query.trim()) {
          navigate(`/projects?search=${encodeURIComponent(query.trim())}`);
          setIsOpen(false);
          clearSearch();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleResultClick = useCallback(
    (item: SearchResultItem) => {
      let path = '';
      switch (item.type) {
        case 'project':
          path = `/projects/${item.id}`;
          break;
        case 'partner':
          path = `/partners/${item.id}`;
          break;
        case 'task':
          if (item.metadata?.projectId) {
            path = `/projects/${item.metadata.projectId}/tasks/${item.id}`;
          } else {
            path = `/tasks/${item.id}`;
          }
          break;
      }
      navigate(path);
      setIsOpen(false);
      clearSearch();
    },
    [navigate, clearSearch]
  );

  const handleClear = () => {
    clearSearch();
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const getTypeIcon = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'project':
        return <FolderOpen className="h-4 w-4" />;
      case 'partner':
        return <Users className="h-4 w-4" />;
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'project':
        return 'プロジェクト';
      case 'partner':
        return 'パートナー';
      case 'task':
        return 'タスク';
    }
  };

  const getTypeBadgeStyle = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'project':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'partner':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'task':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    }
  };

  const showDropdown = isOpen && (isQueryValid || query.length >= 2);

  return (
    <div className={clsx('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder="検索..."
          className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-20 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:bg-slate-800"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>

        {/* Right side: Clear button and keyboard shortcut */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              aria-label="クリア"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-400">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          {isLoading && !results ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : hasResults ? (
            <>
              {/* Projects */}
              {results?.projects && results.projects.length > 0 && (
                <ResultSection
                  title="プロジェクト"
                  items={results.projects}
                  selectedIndex={selectedIndex}
                  flatResults={flatResults}
                  onSelect={handleResultClick}
                  getTypeIcon={getTypeIcon}
                  getTypeBadgeStyle={getTypeBadgeStyle}
                />
              )}

              {/* Partners */}
              {results?.partners && results.partners.length > 0 && (
                <ResultSection
                  title="パートナー"
                  items={results.partners}
                  selectedIndex={selectedIndex}
                  flatResults={flatResults}
                  onSelect={handleResultClick}
                  getTypeIcon={getTypeIcon}
                  getTypeBadgeStyle={getTypeBadgeStyle}
                />
              )}

              {/* Tasks */}
              {results?.tasks && results.tasks.length > 0 && (
                <ResultSection
                  title="タスク"
                  items={results.tasks}
                  selectedIndex={selectedIndex}
                  flatResults={flatResults}
                  onSelect={handleResultClick}
                  getTypeIcon={getTypeIcon}
                  getTypeBadgeStyle={getTypeBadgeStyle}
                />
              )}

              {/* Footer with search all link */}
              <div className="border-t border-gray-200 px-4 py-2 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/projects?search=${encodeURIComponent(query.trim())}`);
                    setIsOpen(false);
                    clearSearch();
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  「{query}」をすべて検索
                </button>
              </div>
            </>
          ) : isQueryValid ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              「{query}」に一致する結果はありません
            </div>
          ) : query.length > 0 && query.length < 2 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              2文字以上入力してください
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Result Section Component
interface ResultSectionProps {
  title: string;
  items: SearchResultItem[];
  selectedIndex: number;
  flatResults: SearchResultItem[];
  onSelect: (item: SearchResultItem) => void;
  getTypeIcon: (type: SearchResultItem['type']) => React.ReactNode;
  getTypeBadgeStyle: (type: SearchResultItem['type']) => string;
}

function ResultSection({
  title,
  items,
  selectedIndex,
  flatResults,
  onSelect,
  getTypeIcon,
  getTypeBadgeStyle,
}: ResultSectionProps) {
  return (
    <div>
      <div className="sticky top-0 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:bg-slate-700 dark:text-gray-400">
        {title}
      </div>
      {items.map((item) => {
        const flatIndex = flatResults.findIndex(
          (r) => r.id === item.id && r.type === item.type
        );
        const isSelected = selectedIndex === flatIndex;

        return (
          <button
            key={`${item.type}-${item.id}`}
            type="button"
            onClick={() => onSelect(item)}
            className={clsx(
              'flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-slate-700',
              isSelected && 'bg-gray-100 dark:bg-slate-700'
            )}
          >
            <span
              className={clsx(
                'mt-0.5 flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
                getTypeBadgeStyle(item.type)
              )}
            >
              {getTypeIcon(item.type)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                {item.name}
              </div>
              {item.description && (
                <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                  {item.description}
                </div>
              )}
              {item.metadata && (
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400 dark:text-gray-500">
                  {item.type === 'project' && item.metadata.managerName ? (
                    <span>担当: {String(item.metadata.managerName)}</span>
                  ) : null}
                  {item.type === 'partner' && item.metadata.contactPerson ? (
                    <span>担当者: {String(item.metadata.contactPerson)}</span>
                  ) : null}
                  {item.type === 'task' && item.metadata.projectName ? (
                    <span>案件: {String(item.metadata.projectName)}</span>
                  ) : null}
                  {item.status && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-slate-600">
                      {item.status}
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
