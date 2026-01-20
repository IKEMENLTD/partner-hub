import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, Filter, X, List, LayoutGrid } from 'lucide-react';
import { usePartners } from '@/hooks';
import type { Partner, PartnerFilter, PartnerStatus } from '@/types';
import {
  Button,
  Select,
  Badge,
  Card,
  PageLoading,
  ErrorMessage,
  EmptyState,
  Pagination,
  PaginationInfo,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/common';
import { PartnerCard } from '@/components/partner';
import clsx from 'clsx';

const STATUS_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: 'active', label: 'アクティブ' },
  { value: 'inactive', label: '非アクティブ' },
  { value: 'pending', label: '申請中' },
  { value: 'suspended', label: '停止中' },
];

const statusConfig = {
  active: { label: 'アクティブ', variant: 'success' as const },
  inactive: { label: '非アクティブ', variant: 'default' as const },
  pending: { label: '申請中', variant: 'warning' as const },
  suspended: { label: '停止中', variant: 'danger' as const },
};

export function PartnerListPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<PartnerFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, isLoading, error, refetch } = usePartners({
    page,
    pageSize: 12,
    search: search || undefined,
    ...filters,
  });

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== ''
  ).length;

  const handlePartnerClick = (partner: Partner) => {
    navigate(`/partners/${partner.id}`);
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
        message="パートナーの読み込みに失敗しました"
        retry={() => refetch()}
      />
    );
  }

  const partners = data?.data || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">パートナー一覧</h1>
          <p className="mt-1 text-gray-600">全 {totalItems} 社</p>
        </div>
        <Button
          as={Link}
          to="/partners/new"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          新規パートナー
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="パートナーを検索..."
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
          <button
            onClick={() => setViewMode('grid')}
            className={clsx(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              viewMode === 'grid'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800'
            )}
            aria-pressed={viewMode === 'grid'}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              viewMode === 'list'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800'
            )}
            aria-pressed={viewMode === 'list'}
          >
            <List className="h-4 w-4" />
          </button>
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
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    status: e.target.value ? (e.target.value as PartnerStatus) : undefined,
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
      {partners.length === 0 ? (
        <EmptyState
          title="パートナーがいません"
          description="新しいパートナーを登録してください"
          action={
            <Button
              as={Link}
              to="/partners/new"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              新規パートナーを登録
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              onClick={() => handlePartnerClick(partner)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>パートナー名</TableHead>
                <TableHead>会社名</TableHead>
                <TableHead>メール</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>スキル</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner) => {
                const status = statusConfig[partner.status] ?? { label: partner.status, variant: 'default' as const };
                return (
                  <TableRow
                    key={partner.id}
                    onClick={() => handlePartnerClick(partner)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <Link
                        to={`/partners/${partner.id}`}
                        className="font-medium text-gray-900 hover:text-primary-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {partner.name}
                      </Link>
                    </TableCell>
                    <TableCell>{partner.companyName || '-'}</TableCell>
                    <TableCell>{partner.email}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(partner.skills || []).slice(0, 2).map((s) => (
                          <span
                            key={s}
                            className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-700 dark:text-gray-400"
                          >
                            {s}
                          </span>
                        ))}
                        {(partner.skills || []).length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{(partner.skills || []).length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
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
    </div>
  );
}
