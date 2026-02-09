import type { ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { SortOrder } from '@/types';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">{children}</table>
    </div>
  );
}

interface TableHeaderProps {
  children: ReactNode;
}

export function TableHeader({ children }: TableHeaderProps) {
  return <thead className="bg-gray-50 dark:bg-slate-800">{children}</thead>;
}

interface TableBodyProps {
  children: ReactNode;
}

export function TableBody({ children }: TableBodyProps) {
  return <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-800">{children}</tbody>;
}

interface TableRowProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function TableRow({ children, onClick, className }: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={clsx(
        onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700',
        className
      )}
    >
      {children}
    </tr>
  );
}

interface TableHeadProps {
  children?: ReactNode;
  sortable?: boolean;
  sortOrder?: SortOrder | null;
  onSort?: () => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function TableHead({
  children,
  sortable = false,
  sortOrder,
  onSort,
  className,
  align = 'left',
}: TableHeadProps) {
  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <th
      scope="col"
      className={clsx(
        'px-2 py-2 sm:px-4 sm:py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400',
        alignStyles[align],
        sortable && 'cursor-pointer select-none hover:text-gray-700',
        className
      )}
      onClick={sortable ? onSort : undefined}
      aria-sort={
        sortOrder === 'asc'
          ? 'ascending'
          : sortOrder === 'desc'
          ? 'descending'
          : undefined
      }
    >
      <div className={clsx('flex items-center gap-1', align === 'right' && 'justify-end')}>
        {children}
        {sortable && (
          <span className="text-gray-400">
            {sortOrder === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : sortOrder === 'desc' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4" />
            )}
          </span>
        )}
      </div>
    </th>
  );
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function TableCell({
  children,
  className,
  align = 'left',
}: TableCellProps) {
  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td
      className={clsx(
        'whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-900 dark:text-gray-100',
        alignStyles[align],
        className
      )}
    >
      {children}
    </td>
  );
}
