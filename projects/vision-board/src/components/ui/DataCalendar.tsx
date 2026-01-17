'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getTodayString, getMonthDates } from '@/lib/utils';

interface DataCalendarProps {
  routines: any[];
  milestones: any[];
  darkMode: boolean;
}

// ローカル時刻でYYYY-MM-DD形式を生成（マイルストーン日付用）
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DataCalendar = ({ routines, milestones, darkMode }: DataCalendarProps) => {
  const t = useTranslations('calendar');
  const tCommon = useTranslations('common');
  const [currentDate, setCurrentDate] = useState(new Date());
  const todayString = getTodayString();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthDates = getMonthDates(year, month);

  const monthNames = t.raw('months') as string[];
  const weekdays = t.raw('weekdays') as string[];
  // 日曜始まり→月曜始まりに変換
  const weekdaysFromMonday = [...weekdays.slice(1), weekdays[0]];

  // Get milestone completion dates with their titles
  const milestoneByDate = new Map<string, string>(
    milestones
      .filter(m => m.completedAt)
      .map(m => [formatLocalDate(new Date(m.completedAt)), m.title])
  );

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className={`p-2 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
          }`}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {year}{t('yearSuffix')} {monthNames[month]}
          </span>
          <button
            onClick={goToToday}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {tCommon('today')}
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className={`p-2 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
          }`}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdaysFromMonday.map((day, idx) => (
          <div
            key={idx}
            className={`text-center text-xs font-medium py-1 ${
              darkMode ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthDates.map(({ date, isCurrentMonth }, idx) => {
          const isToday = date === todayString;
          const hasMilestone = milestoneByDate.has(date);
          const isFuture = date > todayString;

          // Get routine completions for this date
          const routineCompletions = routines.map(r => ({
            color: r.color || '#8b5cf6',
            completed: r.history?.[date] || false,
          })).filter(r => r.completed);

          // Split dots into rows of 5
          const dotRows: typeof routineCompletions[] = [];
          for (let i = 0; i < routineCompletions.length; i += 5) {
            dotRows.push(routineCompletions.slice(i, i + 5));
          }

          return (
            <div
              key={idx}
              className={`relative h-12 p-1 rounded-lg transition-colors ${
                !isCurrentMonth
                  ? 'opacity-30'
                  : isToday
                    ? 'bg-violet-500/20 ring-2 ring-violet-500'
                    : darkMode
                      ? 'hover:bg-gray-700'
                      : 'hover:bg-gray-200'
              }`}
            >
              {/* Date and routine dots in same row */}
              <div className="flex items-start gap-1.5 py-0.5 px-2.5">
                <span className={`text-xs font-medium flex-shrink-0 w-3 text-right ${
                  isToday
                    ? 'text-violet-400 font-bold'
                    : darkMode
                      ? 'text-gray-300'
                      : 'text-gray-700'
                }`}>
                  {parseInt(date.slice(8))}
                </span>
                {/* Routine dots: 5 per row */}
                {dotRows.length > 0 && !isFuture && (
                  <div className="flex flex-col gap-0.75 mt-1.5">
                    {dotRows.map((row, rowIdx) => (
                      <div key={rowIdx} className="flex gap-0.75">
                        {row.map((r, i) => (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: r.color }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Milestone star overlay */}
              {hasMilestone && (
                <div className="absolute inset-0 flex px-2.75 py-4.5 pointer-events-none">
                  <span className="text-xl text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.8)]">
                    ★
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {t('progress')}
        </div>
        <div className="flex flex-wrap gap-3">
          {routines.map(r => (
            <div key={r.id} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: r.color || '#8b5cf6' }}
              />
              <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {r.title}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-yellow-400">★</span>
            <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {t('milestoneAchieved')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
