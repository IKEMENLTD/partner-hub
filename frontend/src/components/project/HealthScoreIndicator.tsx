import clsx from 'clsx';
import { Circle } from 'lucide-react';

interface HealthScoreIndicatorProps {
  score: number;
  showLabel?: boolean;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * ヘルススコアの状態を取得
 * - 緑 (良好): score >= 70
 * - 黄 (注意): score >= 40 && < 70
 * - 赤 (危険): score < 40
 */
function getHealthStatus(score: number): {
  color: 'green' | 'yellow' | 'red';
  label: string;
  bgClass: string;
  textClass: string;
  iconClass: string;
} {
  if (score >= 70) {
    return {
      color: 'green',
      label: '良好',
      bgClass: 'bg-green-100 dark:bg-green-900/30',
      textClass: 'text-green-700 dark:text-green-400',
      iconClass: 'text-green-500',
    };
  }
  if (score >= 40) {
    return {
      color: 'yellow',
      label: '注意',
      bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
      textClass: 'text-yellow-700 dark:text-yellow-400',
      iconClass: 'text-yellow-500',
    };
  }
  return {
    color: 'red',
    label: '危険',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
    iconClass: 'text-red-500',
  };
}

const sizeConfig = {
  sm: {
    container: 'px-2 py-0.5 text-xs',
    icon: 'h-2.5 w-2.5',
    gap: 'gap-1',
  },
  md: {
    container: 'px-2.5 py-1 text-sm',
    icon: 'h-3 w-3',
    gap: 'gap-1.5',
  },
  lg: {
    container: 'px-3 py-1.5 text-base',
    icon: 'h-4 w-4',
    gap: 'gap-2',
  },
};

/**
 * ヘルススコアインジケーター（信号機表示）
 * 案件の健全性をカラーコードで視覚的に表示するコンポーネント
 */
export function HealthScoreIndicator({
  score,
  showLabel = true,
  showScore = true,
  size = 'sm',
  className,
}: HealthScoreIndicatorProps) {
  const status = getHealthStatus(score);
  const sizeClasses = sizeConfig[size];

  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        status.bgClass,
        status.textClass,
        sizeClasses.container,
        sizeClasses.gap,
        className
      )}
      title={`ヘルススコア: ${score}点 (${status.label})`}
      role="status"
      aria-label={`ヘルススコア: ${score}点、状態: ${status.label}`}
    >
      <Circle
        className={clsx(sizeClasses.icon, status.iconClass)}
        fill="currentColor"
        aria-hidden="true"
      />
      {showScore && <span className="font-semibold">{score}</span>}
      {showLabel && <span className="opacity-80">{status.label}</span>}
    </div>
  );
}

/**
 * ヘルススコアの大型カード表示用コンポーネント
 * Quick Statsセクションなどで使用
 */
interface HealthScoreCardDisplayProps {
  score: number;
  className?: string;
}

export function HealthScoreCardDisplay({ score, className }: HealthScoreCardDisplayProps) {
  const status = getHealthStatus(score);

  return (
    <div className={clsx('flex flex-col items-center', className)}>
      <Circle
        className={clsx('h-6 w-6 mb-2', status.iconClass)}
        fill="currentColor"
        aria-hidden="true"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">ヘルススコア</p>
      <p className={clsx('text-lg font-bold', status.textClass)}>
        {score}
      </p>
      <span
        className={clsx(
          'text-xs font-medium px-2 py-0.5 rounded-full mt-1',
          status.bgClass,
          status.textClass
        )}
      >
        {status.label}
      </span>
    </div>
  );
}

/**
 * ヘルススコアブレークダウン表示コンポーネント
 * 各指標の詳細を表示
 */
interface HealthScoreBreakdownProps {
  onTimeRate: number;
  completionRate: number;
  budgetHealth: number;
  overallScore: number;
  className?: string;
}

export function HealthScoreBreakdown({
  onTimeRate,
  completionRate,
  budgetHealth,
  overallScore,
  className,
}: HealthScoreBreakdownProps) {
  const metrics = [
    { label: '期限遵守率', value: onTimeRate, key: 'onTimeRate' },
    { label: '完了率', value: completionRate, key: 'completionRate' },
    { label: '予算健全性', value: budgetHealth, key: 'budgetHealth' },
  ];

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Overall Score */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          総合ヘルススコア
        </span>
        <HealthScoreIndicator score={overallScore} size="md" />
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        {metrics.map((metric) => {
          const status = getHealthStatus(metric.value);
          return (
            <div key={metric.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {metric.label}
                </span>
                <span className={clsx('text-xs font-medium', status.textClass)}>
                  {metric.value}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-slate-700">
                <div
                  className={clsx(
                    'h-1.5 rounded-full transition-all',
                    metric.value >= 70 ? 'bg-green-500' :
                    metric.value >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ width: `${Math.min(metric.value, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { getHealthStatus };
