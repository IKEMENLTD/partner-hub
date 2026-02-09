import type { ReactNode } from 'react';
import clsx from 'clsx';
import { InboxIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-8 sm:py-12 text-center',
        className
      )}
    >
      <div className="mb-4 text-gray-400">
        {icon || <InboxIcon className="h-12 w-12" aria-hidden="true" />}
      </div>
      <h3 className="mb-2 text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-gray-500">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
