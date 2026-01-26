'use client';

import { useState } from 'react';
import { GripVertical, Check, Trash2, Plus, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getWeekDates, getTodayString, getDayLabel, getDayOfWeekIndex } from '@/lib/utils';
import { ColorPicker } from '@/components/ui/ColorPicker';

interface RoutineWeeklyTableProps {
  routines: any[];
  weekOffset: number;
  onToggleRoutine: (routineId: string, date: string) => void;
  onAddRoutine: (title: string) => void;
  onDeleteRoutine: (routineId: string) => void;
  onUpdateRoutineColor: (routineId: string, color: string) => void;
  onUpdateRoutineTitle: (routineId: string, newTitle: string) => void;
  onUpdateActiveDays: (routineId: string, activeDays: number[] | undefined) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onActiveDaysModeChange?: (isActive: boolean) => void;
  onShowSharePanel?: () => void;
  darkMode: boolean;
}

export const RoutineWeeklyTable = ({
  routines,
  weekOffset,
  onToggleRoutine,
  onAddRoutine,
  onDeleteRoutine,
  onUpdateRoutineColor,
  onUpdateRoutineTitle,
  onUpdateActiveDays,
  onReorder,
  onActiveDaysModeChange,
  onShowSharePanel,
  darkMode,
}: RoutineWeeklyTableProps) => {
  const t = useTranslations('routineTable');
  const tPageEditor = useTranslations('pageEditor');
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editingRoutineTitle, setEditingRoutineTitle] = useState('');
  const [isActiveDaysMode, setIsActiveDaysMode] = useState(false);
  const weekDates = getWeekDates(weekOffset);
  const todayString = getTodayString();

  const handleUpdateTitle = (id: string) => {
    if (editingRoutineTitle.trim()) {
      onUpdateRoutineTitle(id, editingRoutineTitle.trim());
    }
    setEditingRoutineId(null);
    setEditingRoutineTitle('');
  };

  const handleAddRoutine = () => {
    if (newRoutineTitle.trim()) {
      onAddRoutine(newRoutineTitle.trim());
      setNewRoutineTitle('');
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (index: number) => {
    // Visual feedback handled in component
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex !== null && dragIndex !== targetIndex) {
      onReorder(dragIndex, targetIndex);
    }
    setDragIndex(null);
  };

  const handleToggleActiveDaysMode = () => {
    const newMode = !isActiveDaysMode;
    setIsActiveDaysMode(newMode);
    onActiveDaysModeChange?.(newMode);
  };

  // 曜日のトグル処理
  const handleToggleActiveDay = (routineId: string, dayIndex: number) => {
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;

    // 現在のactiveDays（undefinedの場合は全曜日オン）
    const currentActiveDays = routine.activeDays || [0, 1, 2, 3, 4, 5, 6];

    let newActiveDays: number[];
    if (currentActiveDays.includes(dayIndex)) {
      // オフにする（最低1日は残す）
      newActiveDays = currentActiveDays.filter((d: number) => d !== dayIndex);
      if (newActiveDays.length === 0) {
        // 全部オフにはできない
        return;
      }
    } else {
      // オンにする
      newActiveDays = [...currentActiveDays, dayIndex].sort((a, b) => a - b);
    }

    // 全曜日オンならundefinedに戻す
    if (newActiveDays.length === 7) {
      onUpdateActiveDays(routineId, undefined);
    } else {
      onUpdateActiveDays(routineId, newActiveDays);
    }
  };

  // 指定日がルーティンの実行日かどうかを判定
  const isActiveOnDate = (routine: any, date: string): boolean => {
    if (!routine.activeDays) return true;
    const dayIndex = getDayOfWeekIndex(date);
    return routine.activeDays.includes(dayIndex);
  };

  return (
    <div className={`rounded-lg overflow-hidden ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className={darkMode ? 'bg-gray-700/50' : 'bg-gray-200'}>
            <th className="w-8"></th>
            <th className={`py-2 px-3 text-left font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <div className="flex items-center gap-2">
                {t('task')}
                <button
                  onClick={handleToggleActiveDaysMode}
                  className={`text-xs px-2 py-0.5 rounded transition-colors ${
                    isActiveDaysMode
                      ? 'bg-violet-500 text-white'
                      : darkMode
                        ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                  }`}
                >
                  {isActiveDaysMode ? t('activeDays.done') : t('activeDays.edit')}
                </button>
              </div>
            </th>
            {weekDates.map((date, idx) => {
              const isToday = date === todayString;
              return (
                <th
                  key={date}
                  className={`py-2 px-2 text-center font-medium w-10 ${
                    isToday
                      ? 'bg-violet-500/20 text-violet-400'
                      : darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  <div>{getDayLabel(idx)}</div>
                  {!isActiveDaysMode && (
                    <div className="text-xs opacity-60">{date.slice(8)}</div>
                  )}
                </th>
              );
            })}
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {routines.map((routine, index) => (
            <tr
              key={routine.id}
              className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
              draggable={!isActiveDaysMode}
              onDragStart={() => !isActiveDaysMode && handleDragStart(index)}
              onDragOver={(e) => { e.preventDefault(); handleDragOver(index); }}
              onDrop={() => handleDrop(index)}
            >
              <td className="py-2 px-1">
                {!isActiveDaysMode && (
                  <div className={`cursor-grab active:cursor-grabbing p-1 rounded ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}>
                    <GripVertical size={14} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                  </div>
                )}
              </td>
              <td className={`py-2 px-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                <div className="flex items-center gap-2">
                  <ColorPicker
                    color={routine.color || '#8b5cf6'}
                    onChange={(color) => onUpdateRoutineColor(routine.id, color)}
                    darkMode={darkMode}
                  />
                  {editingRoutineId === routine.id ? (
                    <input
                      type="text"
                      value={editingRoutineTitle}
                      onChange={(e) => setEditingRoutineTitle(e.target.value)}
                      onBlur={() => handleUpdateTitle(routine.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateTitle(routine.id);
                        if (e.key === 'Escape') {
                          setEditingRoutineId(null);
                          setEditingRoutineTitle('');
                        }
                      }}
                      className={`flex-1 px-2 py-0.5 rounded border outline-none text-sm ${
                        darkMode
                          ? 'bg-gray-700 text-gray-200 border-violet-500'
                          : 'bg-white text-gray-700 border-violet-500'
                      }`}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="cursor-pointer"
                      onDoubleClick={() => {
                        if (!isActiveDaysMode) {
                          setEditingRoutineId(routine.id);
                          setEditingRoutineTitle(routine.title);
                        }
                      }}
                    >
                      {routine.title}
                    </span>
                  )}
                </div>
              </td>
              {weekDates.map((date) => {
                const dayIndex = getDayOfWeekIndex(date);
                const isChecked = routine.history?.[date] || false;
                const isToday = date === todayString;
                const isFuture = date > todayString;
                const isActiveDay = isActiveOnDate(routine, date);

                // 実行日指定モード：トグルスイッチ表示
                if (isActiveDaysMode) {
                  const isOn = !routine.activeDays || routine.activeDays.includes(dayIndex);
                  return (
                    <td
                      key={date}
                      className={`py-2 px-2 text-center ${isToday ? 'bg-violet-500/10' : ''}`}
                    >
                      <button
                        onClick={() => handleToggleActiveDay(routine.id, dayIndex)}
                        className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${
                          isOn
                            ? 'bg-violet-500 shadow-md'
                            : darkMode
                              ? 'bg-gray-600 hover:bg-gray-500'
                              : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      >
                        {isOn && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </button>
                    </td>
                  );
                }

                // 通常モード：チェックボックス表示
                return (
                  <td
                    key={date}
                    className={`py-2 px-2 text-center ${isToday ? 'bg-violet-500/10' : ''}`}
                  >
                    {isFuture ? (
                      <span className={`${!isActiveDay ? 'opacity-30' : ''} text-gray-500`}>-</span>
                    ) : (
                      <button
                        onClick={() => isActiveDay && onToggleRoutine(routine.id, date)}
                        disabled={!isActiveDay}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                          !isActiveDay ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                        style={{
                          backgroundColor: isChecked
                            ? routine.color || '#8b5cf6'
                            : !isActiveDay
                              ? (darkMode ? '#374151' : '#9ca3af')
                              : (darkMode ? '#4b5563' : '#d1d5db'),
                        }}
                      >
                        {isChecked && <Check size={14} className="text-white" />}
                      </button>
                    )}
                  </td>
                );
              })}
              <td className="py-2 px-1">
                {!isActiveDaysMode && (
                  <button
                    onClick={() => onDeleteRoutine(routine.id)}
                    className="p-1 hover:bg-red-500/20 rounded opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!isActiveDaysMode && (
            <>
              <tr className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <td colSpan={10} className="py-2 px-3">
                  <div className="flex items-center gap-2 ml-6">
                    <input
                      type="text"
                      value={newRoutineTitle}
                      onChange={(e) => setNewRoutineTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddRoutine()}
                      placeholder={tPageEditor('routines.addPlaceholder')}
                      className={`flex-1 bg-transparent border-none outline-none text-sm ${
                        darkMode ? 'text-gray-300 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'
                      }`}
                    />
                    <button
                      onClick={handleAddRoutine}
                      disabled={!newRoutineTitle.trim()}
                      className={`p-1 rounded transition-colors ${
                        newRoutineTitle.trim()
                          ? 'hover:bg-violet-500/20 text-violet-400'
                          : 'text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </td>
              </tr>
              {onShowSharePanel && (
                <tr className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td colSpan={10} className="py-2 px-3">
                    <button
                      onClick={onShowSharePanel}
                      className={`flex items-center gap-2 ml-6 text-sm transition-colors ${
                        darkMode
                          ? 'text-violet-400 hover:text-violet-300'
                          : 'text-violet-600 hover:text-violet-500'
                      }`}
                    >
                      <Share2 size={14} />
                      {tPageEditor('routines.shareFromOther')}
                    </button>
                  </td>
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};
