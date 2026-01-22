import { useMemo, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Project } from '@/types';
import { Button } from '@/components/common';
import clsx from 'clsx';

interface ProjectCalendarProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-400',
  planning: 'bg-blue-500',
  in_progress: 'bg-primary-500',
  review: 'bg-yellow-500',
  completed: 'bg-green-500',
  on_hold: 'bg-gray-400',
  cancelled: 'bg-red-400',
};

export function ProjectCalendar({
  projects,
  onProjectClick,
}: ProjectCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { locale: ja });
    const end = endOfWeek(endOfMonth(currentMonth), { locale: ja });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getProjectsForDay = (day: Date) => {
    const safeProjects = Array.isArray(projects) ? projects : [];
    return safeProjects.filter((project) => {
      const startDate = new Date(project.startDate);
      const endDate = project.endDate
        ? new Date(project.endDate)
        : new Date(project.startDate);

      return isWithinInterval(day, { start: startDate, end: endDate });
    });
  };

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {format(currentMonth, 'yyyy年M月', { locale: ja })}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            aria-label="前月"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            今月
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            aria-label="翌月"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className={clsx(
                'text-center text-sm font-medium py-2',
                index === 0 && 'text-red-500',
                index === 6 && 'text-blue-500',
                index !== 0 && index !== 6 && 'text-gray-700 dark:text-gray-300'
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayProjects = getProjectsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={clsx(
                  'min-h-[100px] rounded-lg border p-2 transition-colors',
                  isCurrentMonth
                    ? 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                    : 'border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-900',
                  isToday && 'ring-2 ring-primary-500'
                )}
              >
                <div
                  className={clsx(
                    'mb-1 text-sm font-medium',
                    !isCurrentMonth && 'text-gray-400 dark:text-gray-500',
                    isToday && 'text-primary-600'
                  )}
                >
                  {format(day, 'd')}
                </div>

                <div className="space-y-1">
                  {dayProjects.slice(0, 3).map((project) => (
                    <button
                      key={project.id}
                      onClick={() => onProjectClick?.(project)}
                      className={clsx(
                        'w-full truncate rounded px-1.5 py-0.5 text-left text-xs text-white',
                        statusColors[project.status] || 'bg-gray-400'
                      )}
                      title={project.name}
                    >
                      {project.name}
                    </button>
                  ))}
                  {dayProjects.length > 3 && (
                    <p className="text-xs text-gray-500 text-center dark:text-gray-400">
                      +{dayProjects.length - 3} 件
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
