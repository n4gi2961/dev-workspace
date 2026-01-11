import { useState, useEffect } from 'react';
import { X, ImagePlus, FileText, Target, Calendar, BarChart3, ChevronLeft, ChevronRight, GripVertical, CheckSquare, Square, Trash2 } from 'lucide-react';
import { CATEGORIES, DECADES } from '@/constants/ui';
import { ROUTINE_COLORS } from '@/constants/styles';
import { generateId, getTodayString } from '@/lib/utils';
import { getEncouragementMessage } from '@/lib/messages';
import { MilestoneInput } from '@/components/ui/MilestoneInput';
import { RoutineWeeklyTable } from '@/components/ui/RoutineWeeklyTable';
import { DataCalendar } from '@/components/ui/DataCalendar';
import { LiquidFillProgress } from '@/components/ui/LiquidFillProgress';

interface PageEditorProps {
  page: any;
  nodeImage: string;
  onUpdate: (updatedPage: any) => void;
  onClose: () => void;
  darkMode: boolean;
}

export const PageEditor = ({ page, nodeImage, onUpdate, onClose, darkMode }: PageEditorProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [weekOffset, setWeekOffset] = useState(0);
  const [dragMilestoneIndex, setDragMilestoneIndex] = useState<number | null>(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editingMilestoneTitle, setEditingMilestoneTitle] = useState('');

  // ローカルstate（タイトル・概要用、高速入力バグ対策）
  const [localTitle, setLocalTitle] = useState(page.title);
  const [localDescription, setLocalDescription] = useState(page.description || '');

  // page変更時にローカルstateを同期
  useEffect(() => {
    setLocalTitle(page.title);
    setLocalDescription(page.description || '');
  }, [page.title, page.description]);

  const tabs = [
    { id: 'overview', label: '概要', icon: FileText },
    { id: 'milestones', label: 'マイルストーン', icon: Target },
    { id: 'routines', label: 'ルーティン', icon: Calendar },
    { id: 'data', label: 'データ', icon: BarChart3 },
  ];

  const updateField = (field: string, value: any) => {
    onUpdate({ ...page, [field]: value, updatedAt: Date.now() });
  };

  // Milestone functions
  const addMilestone = (title: string) => {
    const newMilestone = {
      id: generateId(),
      title,
      completed: false,
      completedAt: null,
    };
    updateField('milestones', [...(page.milestones || []), newMilestone]);
  };

  const toggleMilestone = (id: string) => {
    const milestones = (page.milestones || []).map((m: any) => {
      if (m.id === id) {
        return {
          ...m,
          completed: !m.completed,
          completedAt: !m.completed ? Date.now() : null,
        };
      }
      return m;
    });
    updateField('milestones', milestones);
  };

  const deleteMilestone = (id: string) => {
    updateField('milestones', (page.milestones || []).filter((m: any) => m.id !== id));
  };

  const updateMilestoneTitle = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const milestones = (page.milestones || []).map((m: any) => {
      if (m.id === id) {
        return { ...m, title: newTitle.trim() };
      }
      return m;
    });
    updateField('milestones', milestones);
    setEditingMilestoneId(null);
    setEditingMilestoneTitle('');
  };

  const reorderMilestones = (fromIndex: number, toIndex: number) => {
    const milestones = [...(page.milestones || [])];
    const [moved] = milestones.splice(fromIndex, 1);
    milestones.splice(toIndex, 0, moved);
    updateField('milestones', milestones);
  };

  // Routine functions
  const addRoutine = (title: string) => {
    const randomColor = ROUTINE_COLORS[Math.floor(Math.random() * ROUTINE_COLORS.length)];
    const newRoutine = {
      id: generateId(),
      title,
      color: randomColor,
      history: {},
    };
    updateField('routines', [...(page.routines || []), newRoutine]);
  };

  const toggleRoutine = (routineId: string, date: string) => {
    const routines = (page.routines || []).map((r: any) => {
      if (r.id === routineId) {
        const newHistory = { ...r.history };
        newHistory[date] = !newHistory[date];
        return { ...r, history: newHistory };
      }
      return r;
    });
    updateField('routines', routines);
  };

  const deleteRoutine = (id: string) => {
    updateField('routines', (page.routines || []).filter((r: any) => r.id !== id));
  };

  const updateRoutineColor = (id: string, color: string) => {
    const routines = (page.routines || []).map((r: any) => {
      if (r.id === id) {
        return { ...r, color };
      }
      return r;
    });
    updateField('routines', routines);
  };

  const updateRoutineTitle = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const routines = (page.routines || []).map((r: any) => {
      if (r.id === id) {
        return { ...r, title: newTitle.trim() };
      }
      return r;
    });
    updateField('routines', routines);
  };

  const reorderRoutines = (fromIndex: number, toIndex: number) => {
    const routines = [...(page.routines || [])];
    const [moved] = routines.splice(fromIndex, 1);
    routines.splice(toIndex, 0, moved);
    updateField('routines', routines);
  };

  // Calculate stats
  const completedMilestones = (page.milestones || []).filter((m: any) => m.completed).length;
  const totalMilestones = (page.milestones || []).length;
  const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const todayString = getTodayString();
  const todayRoutines = page.routines || [];
  const todayCompleted = todayRoutines.filter((r: any) => r.history?.[todayString]).length;
  const todayTotal = todayRoutines.length;
  const todayProgress = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  const calculateRoutineRate = () => {
    const routines = page.routines || [];
    if (routines.length === 0) return 0;

    const last30Days: string[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      last30Days.push(date.toISOString().split('T')[0]);
    }

    let totalChecks = 0;
    let possibleChecks = routines.length * 30;

    routines.forEach((r: any) => {
      last30Days.forEach(date => {
        if (r.history?.[date]) totalChecks++;
      });
    });

    return Math.round((totalChecks / possibleChecks) * 100);
  };

  const routineRate = calculateRoutineRate();

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${darkMode ? 'bg-black/80' : 'bg-white/80'} backdrop-blur-md`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col ${
          darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div
          className="bg-cover bg-center relative flex-shrink-0"
          style={{
            height: '27vh',
            backgroundImage: page.headerImage || nodeImage ? `url(${page.headerImage || nodeImage})` : undefined,
            backgroundColor: !page.headerImage && !nodeImage ? (darkMode ? '#374151' : '#e5e7eb') : undefined,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/30 hover:bg-black/50 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
          {!page.headerImage && !nodeImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImagePlus size={48} className={darkMode ? 'text-gray-600' : 'text-gray-400'} />
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-6">
            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={() => updateField('title', localTitle)}
              placeholder="目標のタイトル"
              className="w-full text-3xl font-bold bg-transparent border-none outline-none text-white placeholder-white/50 drop-shadow-lg"
            />
          </div>
        </div>

        {/* Meta Info */}
        <div className={`px-6 py-3 border-b flex-shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={page.category || ''}
              onChange={(e) => updateField('category', e.target.value || null)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                darkMode
                  ? 'bg-gray-800 text-gray-300 border-gray-600'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              } border outline-none`}
            >
              <option value="">カテゴリー未設定</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            <select
              value={page.decade || ''}
              onChange={(e) => updateField('decade', e.target.value || null)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                darkMode
                  ? 'bg-gray-800 text-gray-300 border-gray-600'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              } border outline-none`}
            >
              <option value="">達成年代未設定</option>
              {DECADES.map(dec => (
                <option key={dec.id} value={dec.id}>{dec.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`px-6 flex gap-1 border-b flex-shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-violet-500 text-violet-500'
                    : darkMode
                      ? 'border-transparent text-gray-400 hover:text-gray-300'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    概要・メモ
                  </label>
                  <textarea
                    value={localDescription}
                    onChange={(e) => setLocalDescription(e.target.value)}
                    onBlur={() => updateField('description', localDescription)}
                    placeholder="この目標について自由に記述..."
                    rows={4}
                    className={`w-full px-4 py-3 rounded-lg resize-none ${
                      darkMode
                        ? 'bg-gray-800 text-gray-200 placeholder-gray-500 border-gray-600'
                        : 'bg-gray-100 text-gray-700 placeholder-gray-400 border-gray-200'
                    } border outline-none focus:ring-2 focus:ring-violet-500/50`}
                  />
                </div>

                {/* Stats with Liquid Fill */}
                <div className="grid grid-cols-3 gap-4">
                  <LiquidFillProgress
                    percentage={milestoneProgress}
                    color="violet"
                    label="マイルストーン進捗"
                    darkMode={darkMode}
                    message={getEncouragementMessage(milestoneProgress, 'milestone')}
                  />
                  <LiquidFillProgress
                    percentage={todayProgress}
                    color="rose"
                    label="今日のルーティン"
                    darkMode={darkMode}
                    message={getEncouragementMessage(todayProgress, 'today')}
                  />
                  <LiquidFillProgress
                    percentage={routineRate}
                    color="emerald"
                    label="継続率 (30日)"
                    darkMode={darkMode}
                    message={getEncouragementMessage(routineRate, 'streak')}
                  />
                </div>
              </div>
            )}

            {/* Milestones Tab */}
            {activeTab === 'milestones' && (
              <div className="space-y-3">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  目標達成までの中長期的なステップを管理します。ドラッグで並び替え可能です。
                </p>

                {(page.milestones || []).map((milestone: any, idx: number) => (
                  <div
                    key={milestone.id}
                    draggable
                    onDragStart={() => setDragMilestoneIndex(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragMilestoneIndex !== null && dragMilestoneIndex !== idx) {
                        reorderMilestones(dragMilestoneIndex, idx);
                      }
                      setDragMilestoneIndex(null);
                    }}
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-100 hover:bg-gray-150'
                    } group ${dragMilestoneIndex === idx ? 'opacity-50' : ''}`}
                  >
                    <div className={`cursor-grab active:cursor-grabbing p-1 rounded ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                    }`}>
                      <GripVertical size={14} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                    </div>
                    <button
                      onClick={() => toggleMilestone(milestone.id)}
                      className="flex-shrink-0"
                    >
                      {milestone.completed ? (
                        <CheckSquare size={20} className="text-emerald-400" />
                      ) : (
                        <Square size={20} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                      )}
                    </button>
                    {editingMilestoneId === milestone.id ? (
                      <input
                        type="text"
                        value={editingMilestoneTitle}
                        onChange={(e) => setEditingMilestoneTitle(e.target.value)}
                        onBlur={() => updateMilestoneTitle(milestone.id, editingMilestoneTitle)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') updateMilestoneTitle(milestone.id, editingMilestoneTitle);
                          if (e.key === 'Escape') {
                            setEditingMilestoneId(null);
                            setEditingMilestoneTitle('');
                          }
                        }}
                        className={`flex-1 px-2 py-0.5 rounded border outline-none ${
                          darkMode
                            ? 'bg-gray-700 text-gray-200 border-violet-500'
                            : 'bg-white text-gray-700 border-violet-500'
                        }`}
                        autoFocus
                      />
                    ) : (
                      <span
                        className={`flex-1 cursor-pointer ${
                          milestone.completed
                            ? 'line-through opacity-60'
                            : darkMode ? 'text-gray-200' : 'text-gray-700'
                        }`}
                        onDoubleClick={() => {
                          setEditingMilestoneId(milestone.id);
                          setEditingMilestoneTitle(milestone.title);
                        }}
                      >
                        {milestone.title}
                      </span>
                    )}
                    {milestone.completedAt && (
                      <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(milestone.completedAt).toLocaleDateString('ja-JP')}
                      </span>
                    )}
                    <button
                      onClick={() => deleteMilestone(milestone.id)}
                      className="p-1 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                ))}

                <MilestoneInput onAdd={addMilestone} darkMode={darkMode} />
              </div>
            )}

            {/* Routines Tab */}
            {activeTab === 'routines' && (
              <div className="space-y-4">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  日々の習慣を管理します。色をクリックして変更、ドラッグで並び替えできます。
                </p>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setWeekOffset(weekOffset - 1)}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setWeekOffset(0)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      weekOffset === 0
                        ? 'bg-violet-500/20 text-violet-400'
                        : darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    今週
                  </button>
                  <button
                    onClick={() => setWeekOffset(weekOffset + 1)}
                    disabled={weekOffset >= 0}
                    className={`p-2 rounded-lg transition-colors ${
                      weekOffset >= 0
                        ? 'opacity-30 cursor-not-allowed'
                        : darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                <RoutineWeeklyTable
                  routines={page.routines || []}
                  weekOffset={weekOffset}
                  onToggleRoutine={toggleRoutine}
                  onAddRoutine={addRoutine}
                  onDeleteRoutine={deleteRoutine}
                  onUpdateRoutineColor={updateRoutineColor}
                  onUpdateRoutineTitle={updateRoutineTitle}
                  onReorder={reorderRoutines}
                  darkMode={darkMode}
                />
              </div>
            )}

            {/* Data Tab - Calendar View */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <DataCalendar
                  routines={page.routines || []}
                  milestones={page.milestones || []}
                  darkMode={darkMode}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
