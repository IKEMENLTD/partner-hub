import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  List,
  LayoutGrid,
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  X,
} from 'lucide-react';
import { useProjects } from '@/hooks';
import { useUIStore } from '@/store';
import type { Project, ProjectFilter, ViewType, SortOrder } from '@/types';
import {
  Button,
  Select,
  Badge,
  PageLoading,
  ErrorMessage,
  EmptyState,
  Pagination,
  PaginationInfo,
  Card,
} from '@/components/common';
import { ProjectList, ProjectKanban, ProjectCalendar } from '@/components/project';
import clsx from 'clsx';

const STATUS_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: 'draft', label: '下書き' },
  { value: 'planning', label: '計画中' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed', label: '完了' },
  { value: 'on_hold', label: '保留' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'critical', label: '最重要' },
];

const VIEW_OPTIONS: { value: ViewType; icon: typeof List; label: string }[] = [
  { value: 'list', icon: List, label: 'リスト' },
  { value: 'kanban', icon: LayoutGrid, label: 'カンバン' },
  { value: 'calendar', icon: CalendarIcon, label: 'カレンダー' },
];

export function ProjectListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { projectListView, setProjectListView } = useUIStore();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ProjectFilter>({});
  const [sortField, setSortField] = useState<string>('startDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // URLからpartnerIdを取得してフィルターに適用
  const partnerIdFromUrl = searchParams.get('partnerId');

  useEffect(() => {
    if (partnerIdFromUrl) {
      setFilters((prev) => ({ ...prev, partnerId: partnerIdFromUrl }));
    }
  }, [partnerIdFromUrl]);

  const { data, isLoading, error, refetch } = useProjects({
    page,
    pageSize: 12,
    search: search || undefined,
    ...filters,
    sortField,
    sortOrder,
  });

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((v) => v !== undefined && v !== '').length;
  }, [filters]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearch('');
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="案件の読み込みに失敗しました"
        retry={() => refetch()}
      />
    );
  }

  const projects = data?.data || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">案件一覧</h1>
          <p className="mt-1 text-gray-600">
            全 {totalItems} 件の案件
          </p>
        </div>
        <Button
          as={Link}
          to="/projects/new"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          新規案件
        </Button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="案件を検索..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<Filter className="h-4 w-4" />}
          >
            フィルター
            {activeFiltersCount > 0 && (
              <Badge variant="primary" size="sm" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex rounded-lg border border-gray-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {VIEW_OPTIONS.map((view) => (
            <button
              key={view.value}
              onClick={() => setProjectListView(view.value)}
              className={clsx(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                projectListView === view.value
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800'
              )}
              aria-pressed={projectListView === view.value}
              aria-label={`${view.label}ビューに切り替え`}
            >
              <view.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{view.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="border-primary-200 bg-primary-50/30">
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select
                label="ステータス"
                options={STATUS_OPTIONS}
                value={filters.status?.[0] || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    status: e.target.value ? [e.target.value as Project['status']] : undefined,
                  })
                }
              />
            </div>
            <div className="w-48">
              <Select
                label="優先度"
                options={PRIORITY_OPTIONS}
                value={filters.priority?.[0] || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    priority: e.target.value ? [e.target.value as Project['priority']] : undefined,
                  })
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                leftIcon={<X className="h-4 w-4" />}
              >
                クリア
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Content */}
      {projects.length === 0 ? (
        <EmptyState
          title="案件がありません"
          description="新しい案件を作成して、プロジェクト管理を始めましょう"
          action={
            <Button
              as={Link}
              to="/projects/new"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              新規案件を作成
            </Button>
          }
        />
      ) : (
        <>
          {projectListView === 'list' && (
            <ProjectList
              projects={projects}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={handleSort}
              onProjectClick={handleProjectClick}
            />
          )}

          {projectListView === 'kanban' && (
            <ProjectKanban
              projects={projects}
              onProjectClick={handleProjectClick}
            />
          )}

          {projectListView === 'calendar' && (
            <ProjectCalendar
              projects={projects}
              onProjectClick={handleProjectClick}
            />
          )}

          {/* Pagination (only for list view) */}
          {projectListView === 'list' && totalPages > 1 && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <PaginationInfo
                currentPage={page}
                pageSize={12}
                totalItems={totalItems}
              />
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
