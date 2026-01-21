import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HealthScoreProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  trend?: 'up' | 'down' | 'stable';
}

function getScoreColor(score: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (score >= 80) {
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
    };
  }
  if (score >= 60) {
    return {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800',
    };
  }
  if (score >= 40) {
    return {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800',
    };
  }
  return {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  };
}

function getScoreLabel(score: number): string {
  if (score >= 80) return '良好';
  if (score >= 60) return '注意';
  if (score >= 40) return '警告';
  return '危険';
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function HealthScoreBadge({
  score,
  showLabel = true,
  size = 'sm',
  showTrend = false,
  trend,
}: HealthScoreProps) {
  const colors = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        colors.bg,
        colors.text,
        colors.border,
        sizeClasses[size]
      )}
      title={`ヘルススコア: ${score}点 (${label})`}
    >
      {showTrend && trend && (
        <>
          {trend === 'up' && <TrendingUp className="h-3 w-3" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3" />}
          {trend === 'stable' && <Minus className="h-3 w-3" />}
        </>
      )}
      <span>{score}</span>
      {showLabel && <span className="opacity-75">({label})</span>}
    </div>
  );
}

interface HealthScoreDetailProps {
  onTimeRate: number;
  completionRate: number;
  budgetHealth: number;
  overallScore: number;
}

export function HealthScoreDetail({
  onTimeRate,
  completionRate,
  budgetHealth,
  overallScore,
}: HealthScoreDetailProps) {
  const metrics = [
    { label: '期限遵守率', value: onTimeRate },
    { label: '完了率', value: completionRate },
    { label: '予算健全性', value: budgetHealth },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          総合ヘルススコア
        </span>
        <HealthScoreBadge score={overallScore} size="md" />
      </div>

      <div className="space-y-3">
        {metrics.map((metric) => {
          const colors = getScoreColor(metric.value);
          return (
            <div key={metric.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {metric.label}
                </span>
                <span className={clsx('text-xs font-medium', colors.text)}>
                  {metric.value}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-slate-700">
                <div
                  className={clsx(
                    'h-1.5 rounded-full transition-all',
                    metric.value >= 80 ? 'bg-green-500' :
                    metric.value >= 60 ? 'bg-yellow-500' :
                    metric.value >= 40 ? 'bg-orange-500' : 'bg-red-500'
                  )}
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
