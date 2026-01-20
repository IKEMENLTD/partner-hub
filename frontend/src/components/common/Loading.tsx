import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

type LoadingSize = 'sm' | 'md' | 'lg';

interface LoadingProps {
  size?: LoadingSize;
  className?: string;
  text?: string;
}

const sizeStyles: Record<LoadingSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function Loading({ size = 'md', className, text }: LoadingProps) {
  return (
    <div
      className={clsx('flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-label={text || '読み込み中'}
    >
      <Loader2
        className={clsx('animate-spin text-primary-600', sizeStyles[size])}
        aria-hidden="true"
      />
      {text && <p className="text-sm text-gray-500">{text}</p>}
      <span className="sr-only">{text || '読み込み中'}</span>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center">
      <Loading size="lg" text="読み込み中..." />
    </div>
  );
}

export function InlineLoading() {
  return <Loading size="sm" />;
}
