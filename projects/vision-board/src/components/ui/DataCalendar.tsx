import { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { getTodayString, getMonthDates } from '@/lib/utils';

interface DataCalendarProps {
  routines: any[];
  milestones: any[];
  darkMode: boolean;
}

export const DataCalendar = ({ routines, milestones, darkMode }: DataCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const todayString = getTodayString();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthDates = getMonthDates(year, month);

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  // Get milestone completion dates
  const milestoneDates = new Set(
    milestones
      .filter(m => m.completedAt)
      .map(m => new Date(m.completedAt).toISOString().split('T')[0])
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
            {year}年 {monthNames[month]}
          </span>
          <button
            onClick={goToToday}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            今日
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
        {['月', '火', '水', '木', '金', '土', '日'].map(day => (
          <div
            key={day}
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
          const hasMilestone = milestoneDates.has(date);
          const isFuture = date > todayString;

          // Get routine completions for this date
          const routineCompletions = routines.map(r => ({
            color: r.color || '#8b5cf6',
            completed: r.history?.[date] || false,
          })).filter(r => r.completed);

          return (
            <div
              key={idx}
              className={`relative aspect-square p-1 rounded-lg transition-colors ${
                !isCurrentMonth
                  ? 'opacity-30'
                  : isToday
                    ? 'bg-violet-500/20 ring-2 ring-violet-500'
                    : darkMode
                      ? 'hover:bg-gray-700'
                      : 'hover:bg-gray-200'
              }`}
            >
              <div className={`text-xs text-center ${
                isToday
                  ? 'text-violet-400 font-bold'
                  : darkMode
                    ? 'text-gray-300'
                    : 'text-gray-700'
              }`}>
                {parseInt(date.slice(8))}
              </div>

              {/* Routine dots */}
              {routineCompletions.length > 0 && !isFuture && (
                <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                  {routineCompletions.slice(0, 4).map((r, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: r.color }}
                    />
                  ))}
                  {routineCompletions.length > 4 && (
                    <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      +{routineCompletions.length - 4}
                    </div>
                  )}
                </div>
              )}

              {/* Milestone star */}
              {hasMilestone && (
                <div className="absolute top-0 right-0">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          凡例
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
            <Star size={12} className="text-yellow-400 fill-yellow-400" />
            <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              マイルストーン達成
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
