'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, ImagePlus, FileText, Target, Calendar, BarChart3, ChevronLeft, ChevronRight, GripVertical, CheckSquare, Square, Trash2, RefreshCw, Snowflake } from 'lucide-react';
import { uploadImage } from '@/lib/supabase/storage';
import { useTranslations } from 'next-intl';
import { CATEGORIES, DECADES } from '@/constants/ui';
import { generateId, getTodayString } from '@/lib/utils';
import { getMessageKey } from '@/lib/messages';
import { MilestoneInput } from '@/components/ui/MilestoneInput';
import { RoutineWeeklyTable } from '@/components/ui/RoutineWeeklyTable';
import { DataCalendar } from '@/components/ui/DataCalendar';
import { LiquidFillProgress } from '@/components/ui/LiquidFillProgress';
import { ShareRoutinePanel } from '@/components/ui/ShareRoutinePanel';
import { Routine, RoutineNode, Page } from '@/lib/pageMapper';
import { Node } from '@/hooks/useNodes';

interface PageEditorProps {
  page: any;
  nodeImage: string;
  onUpdate: (updatedPage: any) => void;
  onClose: () => void;
  darkMode: boolean;
  onRoutineChecked?: (routineColor: string) => void;
  onImageChange?: (newImageUrl: string) => void;
  nodeId?: string;
  userId?: string;
  boardId?: string;
  onAddFrozenDate?: (date: string) => void;
  onRemoveFrozenDate?: (date: string) => void;
  clearPercent?: number;
  // ルーティン共有機能用（useRoutines経由）
  routines?: Record<string, Routine>;
  routineNodes?: RoutineNode[];
  pages?: Record<string, Page>;
  nodes?: Node[];
  onCreateRoutine?: (title: string) => void;
  onDeleteRoutine?: (routineId: string) => void;
  onToggleRoutine?: (routineId: string, date: string) => void;
  onUpdateRoutineColor?: (routineId: string, color: string) => void;
  onUpdateRoutineTitle?: (routineId: string, title: string) => void;
  onUpdateActiveDays?: (routineId: string, activeDays: number[] | undefined) => void;
  onReorderRoutines?: (fromIndex: number, toIndex: number) => void;
  onAddRoutineToNode?: (routineId: string) => void;
}

export const PageEditor = ({
  page,
  nodeImage,
  onUpdate,
  onClose,
  darkMode,
  onRoutineChecked,
  onImageChange,
  nodeId,
  userId,
  boardId,
  onAddFrozenDate,
  onRemoveFrozenDate,
  clearPercent,
  routines,
  routineNodes,
  pages,
  nodes,
  onCreateRoutine,
  onDeleteRoutine,
  onToggleRoutine,
  onUpdateRoutineColor,
  onUpdateRoutineTitle,
  onUpdateActiveDays,
  onReorderRoutines,
  onAddRoutineToNode,
}: PageEditorProps) => {
  const t = useTranslations('pageEditor');
  const tMessages = useTranslations('messages');
  const [activeTab, setActiveTab] = useState('overview');
  const [weekOffset, setWeekOffset] = useState(0);
  const [dragMilestoneIndex, setDragMilestoneIndex] = useState<number | null>(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [editingMilestoneTitle, setEditingMilestoneTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isActiveDaysMode, setIsActiveDaysMode] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ★ 現在のノードに紐づくルーティン一覧を計算（useRoutines経由）
  const currentNodeRoutines = useMemo(() => {
    if (!routines || !routineNodes || !nodeId) {
      return page.routines || [];
    }

    return routineNodes
      .filter(rn => rn.nodeId === nodeId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(rn => routines[rn.routineId])
      .filter(Boolean);
  }, [routines, routineNodes, nodeId, page.routines]);

  // 画像変更ハンドラ
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageChange || !userId || !boardId) return;

    setIsUploading(true);
    try {
      const newImageUrl = await uploadImage(file, userId, boardId);
      onImageChange(newImageUrl);
    } catch (error) {
      console.error('Image upload failed:', error);
    } finally {
      setIsUploading(false);
      // inputをリセット（同じファイルを再選択可能にする）
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // ローカルstate（タイトル・概要用、高速入力バグ対策）
  const [localTitle, setLocalTitle] = useState(page.title);
  const [localDescription, setLocalDescription] = useState(page.description || '');

  // page変更時にローカルstateを同期
  useEffect(() => {
    setLocalTitle(page.title);
    setLocalDescription(page.description || '');
  }, [page.title, page.description]);

  const tabs = [
    { id: 'overview', label: t('tabs.overview'), icon: FileText },
    { id: 'milestones', label: t('tabs.milestones'), icon: Target },
    { id: 'routines', label: t('tabs.routines'), icon: Calendar },
    { id: 'frozen', label: t('tabs.frozen'), icon: Snowflake },
    { id: 'data', label: t('tabs.data'), icon: BarChart3 },
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

  // ★ Routine functions（useRoutines経由で親コールバックを呼び出す）
  const handleAddRoutine = (title: string) => {
    if (onCreateRoutine) {
      onCreateRoutine(title);
    }
  };

  const handleToggleRoutine = (routineId: string, date: string) => {
    // チェック時に色を親に通知（Star Stack用）
    const routine = routines?.[routineId];
    const wasChecked = routine?.history?.[date] || false;
    const willBeChecked = !wasChecked;

    if (willBeChecked && routine?.color && onRoutineChecked) {
      onRoutineChecked(routine.color);
    }

    if (onToggleRoutine) {
      onToggleRoutine(routineId, date);
    }
  };

  const handleDeleteRoutine = (routineId: string) => {
    if (onDeleteRoutine) {
      onDeleteRoutine(routineId);
    }
  };

  const handleUpdateRoutineColor = (routineId: string, color: string) => {
    if (onUpdateRoutineColor) {
      onUpdateRoutineColor(routineId, color);
    }
  };

  const handleUpdateRoutineTitle = (routineId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    if (onUpdateRoutineTitle) {
      onUpdateRoutineTitle(routineId, newTitle.trim());
    }
  };

  const handleReorderRoutines = (fromIndex: number, toIndex: number) => {
    if (onReorderRoutines) {
      onReorderRoutines(fromIndex, toIndex);
    }
  };

  const handleUpdateActiveDays = (routineId: string, activeDays: number[] | undefined) => {
    if (onUpdateActiveDays) {
      onUpdateActiveDays(routineId, activeDays);
    }
  };

  // Calculate stats
  const completedMilestones = (page.milestones || []).filter((m: any) => m.completed).length;
  const totalMilestones = (page.milestones || []).length;
  const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const todayString = getTodayString();
  // ★ currentNodeRoutines を使用
  const todayCompleted = currentNodeRoutines.filter((r: any) => r.history?.[todayString]).length;
  const todayTotal = currentNodeRoutines.length;
  const todayProgress = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;


  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${darkMode ? 'bg-black/80' : 'bg-white/80'} backdrop-blur-md`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl h-[95vh] sm:h-[90vh] overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl flex flex-col ${
          darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div
          className="bg-cover bg-center relative flex-shrink-0"
          style={{
            height: '20vh',
            backgroundImage: page.headerImage || nodeImage ? `url(${page.headerImage || nodeImage})` : undefined,
            backgroundColor: !page.headerImage && !nodeImage ? (darkMode ? '#374151' : '#e5e7eb') : undefined,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          {/* Hidden file input for image change */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          {/* 画像変更ボタン */}
          {onImageChange && userId && boardId && (
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploading}
              className="absolute top-3 right-14 p-2 bg-black/30 hover:bg-black/50 rounded-lg transition-colors disabled:opacity-50"
              title={t('changeImage')}
            >
              <RefreshCw size={20} className={`text-white ${isUploading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {/* 閉じるボタン */}
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
              placeholder={t('titlePlaceholder')}
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
              <option value="">{t('category.unset')}</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{t(`category.${cat.id}`)}</option>
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
              <option value="">{t('targetYear.unset')}</option>
              {DECADES.map(dec => (
                <option key={dec.id} value={dec.id}>{t(`targetYear.${dec.id}`)}</option>
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
                    {t('overview.title')}
                  </label>
                  <textarea
                    value={localDescription}
                    onChange={(e) => setLocalDescription(e.target.value)}
                    onBlur={() => updateField('description', localDescription)}
                    placeholder={t('overview.placeholder')}
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
                    label={t('milestones.progress')}
                    darkMode={darkMode}
                    message={tMessages(getMessageKey(milestoneProgress, 'milestone'))}
                  />
                  <LiquidFillProgress
                    percentage={todayProgress}
                    color="rose"
                    label={t('routines.todayTitle')}
                    darkMode={darkMode}
                    message={tMessages(getMessageKey(todayProgress, 'today'))}
                  />
                  <LiquidFillProgress
                    percentage={Math.round(clearPercent ?? 0)}
                    color="emerald"
                    label={t('routines.streakLabel')}
                    darkMode={darkMode}
                    message={tMessages(getMessageKey(Math.round(clearPercent ?? 0), 'streak'))}
                    showUnit={false}
                  />
                </div>
              </div>
            )}

            {/* Milestones Tab */}
            {activeTab === 'milestones' && (
              <div className="space-y-3">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('milestones.description')}
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
                  {t('routines.description')}
                </p>

                {/* 実行日指定モード時は週ナビを非表示 */}
                {!isActiveDaysMode && (
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
                      {t('routines.thisWeek')}
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
                )}

                <RoutineWeeklyTable
                  routines={currentNodeRoutines}
                  weekOffset={weekOffset}
                  onToggleRoutine={handleToggleRoutine}
                  onAddRoutine={handleAddRoutine}
                  onDeleteRoutine={handleDeleteRoutine}
                  onUpdateRoutineColor={handleUpdateRoutineColor}
                  onUpdateRoutineTitle={handleUpdateRoutineTitle}
                  onUpdateActiveDays={handleUpdateActiveDays}
                  onReorder={handleReorderRoutines}
                  onActiveDaysModeChange={setIsActiveDaysMode}
                  onShowSharePanel={routines && routineNodes && pages && nodes && onAddRoutineToNode && nodeId
                    ? () => setShowSharePanel(true)
                    : undefined
                  }
                  darkMode={darkMode}
                />

                {/* Share Routine Panel */}
                {showSharePanel && routines && routineNodes && pages && nodes && onAddRoutineToNode && nodeId && (
                  <ShareRoutinePanel
                    routines={routines}
                    routineNodes={routineNodes}
                    pages={pages}
                    nodes={nodes}
                    currentNodeId={nodeId}
                    onAddRoutine={onAddRoutineToNode}
                    onClose={() => setShowSharePanel(false)}
                    darkMode={darkMode}
                  />
                )}
              </div>
            )}

            {/* Frozen Dates Tab */}
            {activeTab === 'frozen' && (
              <div className="space-y-4">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('frozen.description')}
                </p>

                {/* 凍結日リスト */}
                <div className="space-y-2">
                  {(page.frozenDates || []).map((fd: { id: string; date: string }) => (
                    <div
                      key={fd.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        darkMode ? 'bg-gray-800' : 'bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Snowflake size={16} className="text-cyan-400" />
                        <span className={darkMode ? 'text-gray-200' : 'text-gray-700'}>
                          {new Date(fd.date).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short'
                          })}
                        </span>
                      </div>
                      <button
                        onClick={() => onRemoveFrozenDate?.(fd.date)}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* 凍結日追加 */}
                <div className={`p-4 rounded-lg border-2 border-dashed ${
                  darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      className={`flex-1 px-3 py-2 rounded-lg ${
                        darkMode
                          ? 'bg-gray-700 text-gray-200 border-gray-600'
                          : 'bg-white text-gray-700 border-gray-200'
                      } border outline-none focus:ring-2 focus:ring-cyan-500/50`}
                      onChange={(e) => {
                        if (e.target.value && onAddFrozenDate) {
                          onAddFrozenDate(e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                  <p className={`mt-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {t('frozen.hint')}
                  </p>
                </div>

                {(page.frozenDates || []).length === 0 && (
                  <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Snowflake size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('frozen.empty')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Data Tab - Calendar View */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <DataCalendar
                  routines={currentNodeRoutines}
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
