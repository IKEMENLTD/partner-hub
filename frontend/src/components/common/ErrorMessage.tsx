import type { ReactNode } from 'react';
import clsx from 'clsx';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorMessageProps {
  title?: string;
  message: string;
  retry?: () => void;
  className?: string;
}

export function ErrorMessage({
  title = 'エラーが発生しました',
  message,
  retry,
  className,
}: ErrorMessageProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
      role="alert"
    >
      <div className="mb-4 text-red-400">
        <AlertCircle className="h-12 w-12" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500">{message}</p>
      {retry && (
        <Button
          variant="outline"
          onClick={retry}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          再試行
        </Button>
      )}
    </div>
  );
}

interface AlertProps {
  variant: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: ReactNode;
  className?: string;
}

const alertStyles = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error: 'bg-red-50 border-red-200 text-red-800',
};

export function Alert({ variant, title, children, className }: AlertProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border p-4',
        alertStyles[variant],
        className
      )}
      role="alert"
    >
      {title && <h4 className="mb-1 font-medium">{title}</h4>}
      <div className="text-sm">{children}</div>
    </div>
  );
}
