'use client';

import { useState } from 'react';
import { GripVertical, Check, Trash2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getWeekDates, getTodayString, getDayLabel } from '@/lib/utils';
import { ColorPicker } from '@/components/ui/ColorPicker';

interface RoutineWeeklyTableProps {
  routines: any[];
  weekOffset: number;
  onToggleRoutine: (routineId: string, date: string) => void;
  onAddRoutine: (title: string) => void;
  onDeleteRoutine: (routineId: string) => void;
  onUpdateRoutineColor: (routineId: string, color: string) => void;
  onUpdateRoutineTitle: (routineId: string, newTitle: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  darkMode: boolean;
}

export const RoutineWeeklyTable = ({ routines, weekOffset, onToggleRoutine, onAddRoutine, onDeleteRoutine, onUpdateRoutineColor, onUpdateRoutineTitle, onReorder, darkMode }: RoutineWeeklyTableProps) => {
  const t = useTranslations('routineTable');
  const tPageEditor = useTranslations('pageEditor');
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editingRoutineTitle, setEditingRoutineTitle] = useState('');
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

  return (
    <div className={`rounded-lg overflow-hidden ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className={darkMode ? 'bg-gray-700/50' : 'bg-gray-200'}>
            <th className="w-8"></th>
            <th className={`py-2 px-3 text-left font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {t('task')}
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
                  <div className="text-xs opacity-60">{date.slice(8)}</div>
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
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => { e.preventDefault(); handleDragOver(index); }}
              onDrop={() => handleDrop(index)}
            >
              <td className="py-2 px-1">
                <div className={`cursor-grab active:cursor-grabbing p-1 rounded ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                }`}>
                  <GripVertical size={14} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                </div>
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
                        setEditingRoutineId(routine.id);
                        setEditingRoutineTitle(routine.title);
                      }}
                    >
                      {routine.title}
                    </span>
                  )}
                </div>
              </td>
              {weekDates.map((date, idx) => {
                const isChecked = routine.history?.[date] || false;
                const isToday = date === todayString;
                const isFuture = date > todayString;
                return (
                  <td
                    key={date}
                    className={`py-2 px-2 text-center ${isToday ? 'bg-violet-500/10' : ''}`}
                  >
                    {isFuture ? (
                      <span className="text-gray-500">-</span>
                    ) : (
                      <button
                        onClick={() => onToggleRoutine(routine.id, date)}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors`}
                        style={{
                          backgroundColor: isChecked ? routine.color || '#8b5cf6' : (darkMode ? '#4b5563' : '#d1d5db'),
                        }}
                      >
                        {isChecked && <Check size={14} className="text-white" />}
                      </button>
                    )}
                  </td>
                );
              })}
              <td className="py-2 px-1">
                <button
                  onClick={() => onDeleteRoutine(routine.id)}
                  className="p-1 hover:bg-red-500/20 rounded opacity-50 hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </td>
            </tr>
          ))}
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
        </tbody>
      </table>
    </div>
  );
};
